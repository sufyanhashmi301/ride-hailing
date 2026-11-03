import { type Db, drivers, rideAssignments, rides, users } from "@ride/db";
import { and, eq, sql } from "drizzle-orm";
import { isUniqueViolation } from "../../lib/postgres-errors.js";

export type AcceptRideOutcome =
  | { outcome: "accepted"; ride: typeof rides.$inferSelect }
  | { outcome: "ride_not_found" }
  | { outcome: "ride_already_accepted" }
  | { outcome: "driver_not_eligible"; reason: string }
  | { outcome: "driver_busy" };

/**
 * The concurrency-safe accept transaction: locks the ride row, then the driver row (always in
 * that order, to avoid deadlocks with other accept attempts), then commits the assignment with a
 * conditional UPDATE so at most one caller ever wins the ride. The partial unique indexes on
 * `ride_assignments` are the backstop if this logic ever has a bug.
 */
export async function acceptRideTransaction(
  db: Db,
  rideId: string,
  driverId: string,
): Promise<AcceptRideOutcome> {
  return db.transaction(async (tx) => {
    const [ride] = await tx.select().from(rides).where(eq(rides.id, rideId)).for("update");
    if (!ride) {
      return { outcome: "ride_not_found" };
    }

    const [driverRow] = await tx
      .select({ driver: drivers, user: users })
      .from(drivers)
      .innerJoin(users, eq(users.id, drivers.userId))
      .where(eq(drivers.userId, driverId))
      .for("update");
    if (!driverRow) {
      return { outcome: "driver_not_eligible", reason: "Driver account not found" };
    }

    if (ride.status !== "requested") {
      return { outcome: "ride_already_accepted" };
    }

    const { driver, user } = driverRow;
    if (
      !driver.isOnline ||
      !user.isActive ||
      driver.cityId !== ride.cityId ||
      driver.vehicleCategory !== ride.category
    ) {
      return { outcome: "driver_not_eligible", reason: "You are not eligible for this ride" };
    }

    try {
      await tx.insert(rideAssignments).values({ rideId, driverId });
    } catch (error) {
      if (isUniqueViolation(error)) {
        return { outcome: "driver_busy" };
      }
      throw error;
    }

    const updated = await tx
      .update(rides)
      .set({ status: "accepted", acceptedAt: new Date(), version: sql`${rides.version} + 1` })
      .where(and(eq(rides.id, rideId), eq(rides.status, "requested")))
      .returning();

    const acceptedRide = updated[0];
    if (!acceptedRide) {
      return { outcome: "ride_already_accepted" };
    }

    return { outcome: "accepted", ride: acceptedRide };
  });
}
