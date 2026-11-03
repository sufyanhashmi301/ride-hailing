import { type Db, drivers, fares, rideAssignments, rides, users } from "@ride/db";
import { estimatePickupEtaSeconds } from "@ride/domain";
import { desc, eq } from "drizzle-orm";
import { notFound } from "../../lib/api-error.js";
import {
  findActiveRideIdForDriver,
  findAvailableRidesForDriver,
} from "../matching/matching.service.js";
import type { RideListPagination } from "../rides/rides.service.js";
import { getRide, toRideDto } from "../rides/rides.service.js";

export interface UpdateDriverMeInput {
  isOnline?: boolean;
  lastLat?: number;
  lastLng?: number;
}

export async function getDriverMe(db: Db, driverId: string) {
  const [driver] = await db.select().from(drivers).where(eq(drivers.userId, driverId)).limit(1);
  if (!driver) throw notFound("Driver profile not found");
  return driver;
}

export async function updateDriverMe(db: Db, driverId: string, input: UpdateDriverMeInput) {
  const patch: Partial<typeof drivers.$inferInsert> = {};
  if (input.isOnline !== undefined) patch.isOnline = input.isOnline;
  if (input.lastLat !== undefined) patch.lastLat = input.lastLat;
  if (input.lastLng !== undefined) patch.lastLng = input.lastLng;
  if (input.lastLat !== undefined || input.lastLng !== undefined) {
    patch.locationUpdatedAt = new Date();
  }

  const [updated] = await db
    .update(drivers)
    .set(patch)
    .where(eq(drivers.userId, driverId))
    .returning();
  if (!updated) throw notFound("Driver profile not found");
  return updated;
}

export async function listAvailableRides(db: Db, driverId: string) {
  const driver = await getDriverMe(db, driverId);
  if (!driver.isOnline) return [];

  const rows = await findAvailableRidesForDriver(db, driver);

  return rows.map((row) => ({
    id: row.id,
    category: row.category,
    pickup: { lat: row.pickupLat, lng: row.pickupLng, label: row.pickupLabel },
    dropoff: { lat: row.dropoffLat, lng: row.dropoffLng, label: row.dropoffLabel },
    fare: row.fare,
    requestedAt: row.requestedAt.toISOString(),
    pickupEtaSeconds:
      driver.lastLat !== null && driver.lastLng !== null
        ? estimatePickupEtaSeconds(
            { lat: driver.lastLat, lng: driver.lastLng },
            { lat: row.pickupLat, lng: row.pickupLng },
          )
        : null,
  }));
}

export async function getCurrentRide(db: Db, driverId: string) {
  const rideId = await findActiveRideIdForDriver(db, driverId);
  if (!rideId) return null;

  const detail = await getRide(db, rideId, { id: driverId, role: "driver" });
  return toRideDto(detail);
}

export async function listRidesForDriver(db: Db, driverId: string, pagination: RideListPagination) {
  const self = await getDriverMe(db, driverId);
  const [selfUser] = await db.select().from(users).where(eq(users.id, driverId)).limit(1);
  if (!selfUser) throw notFound("Driver profile not found");
  const driverDto = {
    id: driverId,
    name: selfUser.name,
    phone: selfUser.phone,
    vehicleCategory: self.vehicleCategory,
    vehiclePlate: self.vehiclePlate,
  };

  const rows = await db
    .select({ ride: rides, fare: fares })
    .from(rideAssignments)
    .innerJoin(rides, eq(rides.id, rideAssignments.rideId))
    .innerJoin(fares, eq(fares.rideId, rides.id))
    .where(eq(rideAssignments.driverId, driverId))
    .orderBy(desc(rides.requestedAt))
    .limit(pagination.limit)
    .offset(pagination.offset);

  const rideDtos = rows.map((row) =>
    toRideDto({ ride: row.ride, fare: row.fare, driver: driverDto }),
  );

  return { rides: rideDtos, limit: pagination.limit, offset: pagination.offset };
}
