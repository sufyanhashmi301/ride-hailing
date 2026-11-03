import { randomBytes } from "node:crypto";
import { hash } from "@node-rs/argon2";
import type { DriverAdmin, RideCategory, RideStatus } from "@ride/contracts";
import {
  cities,
  type Db,
  drivers,
  fares,
  rideAssignments,
  ridePackages,
  rides,
  users,
} from "@ride/db";
import { desc, eq, inArray } from "drizzle-orm";
import { ApiError, notFound, validationError } from "../../lib/api-error.js";
import { isUniqueViolation, uniqueViolationConstraint } from "../../lib/postgres-errors.js";
import { toRideDto } from "../rides/rides.service.js";

export interface CreateDriverInput {
  name: string;
  email: string;
  phone?: string;
  cityId: string;
  vehicleCategory: RideCategory;
  vehiclePlate: string;
}

export interface ListRidesInput {
  status?: RideStatus;
  limit: number;
  offset: number;
}

function generateTemporaryPassword(): string {
  return randomBytes(9).toString("base64url");
}

export function toDriverAdminDto(
  user: typeof users.$inferSelect,
  driver: typeof drivers.$inferSelect,
): DriverAdmin {
  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    isActive: user.isActive,
    cityId: driver.cityId,
    vehicleCategory: driver.vehicleCategory,
    vehiclePlate: driver.vehiclePlate,
    isOnline: driver.isOnline,
  };
}

export async function createDriver(
  db: Db,
  input: CreateDriverInput,
): Promise<{ driver: DriverAdmin; temporaryPassword: string }> {
  const [city] = await db.select().from(cities).where(eq(cities.id, input.cityId)).limit(1);
  if (!city) throw notFound("City not found");

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hash(temporaryPassword);

  try {
    const { user, driver } = await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          name: input.name,
          email: input.email,
          phone: input.phone,
          role: "driver",
          passwordHash,
        })
        .returning();
      if (!user) throw new Error("user insert returned no row");

      const [driver] = await tx
        .insert(drivers)
        .values({
          userId: user.id,
          cityId: input.cityId,
          vehicleCategory: input.vehicleCategory,
          vehiclePlate: input.vehiclePlate,
          isOnline: false,
        })
        .returning();
      if (!driver) throw new Error("driver insert returned no row");

      return { user, driver };
    });

    return { driver: toDriverAdminDto(user, driver), temporaryPassword };
  } catch (error) {
    if (isUniqueViolation(error)) {
      const constraint = uniqueViolationConstraint(error);
      if (constraint === "uq_users_email") {
        throw new ApiError(409, "EMAIL_ALREADY_EXISTS", "A user with this email already exists");
      }
      if (constraint === "uq_drivers_vehicle_plate") {
        throw new ApiError(
          409,
          "VEHICLE_PLATE_ALREADY_EXISTS",
          "A driver with this vehicle plate already exists",
        );
      }
    }
    throw error;
  }
}

export async function listDrivers(db: Db): Promise<DriverAdmin[]> {
  const rows = await db
    .select({ user: users, driver: drivers })
    .from(users)
    .innerJoin(drivers, eq(drivers.userId, users.id))
    .orderBy(users.name);

  return rows.map((row) => toDriverAdminDto(row.user, row.driver));
}

export async function listActiveCities(db: Db) {
  return db
    .select({ id: cities.id, name: cities.name })
    .from(cities)
    .where(eq(cities.isActive, true))
    .orderBy(cities.name);
}

export async function setDriverActive(
  db: Db,
  driverId: string,
  isActive: boolean,
): Promise<DriverAdmin> {
  const [row] = await db
    .select({ user: users, driver: drivers })
    .from(users)
    .innerJoin(drivers, eq(drivers.userId, users.id))
    .where(eq(users.id, driverId))
    .limit(1);
  if (!row) throw notFound("Driver not found");

  const [updatedUser] = await db
    .update(users)
    .set({ isActive })
    .where(eq(users.id, driverId))
    .returning();
  if (!updatedUser) throw notFound("Driver not found");

  return toDriverAdminDto(updatedUser, row.driver);
}

export async function updatePackage(
  db: Db,
  packageId: string,
  input: {
    baseFarePkr?: number;
    perKmPkr?: number;
    perMinPkr?: number;
    minFarePkr?: number;
  },
) {
  const patch: Partial<typeof ridePackages.$inferInsert> = {};
  if (input.baseFarePkr !== undefined) patch.baseFarePkr = input.baseFarePkr;
  if (input.perKmPkr !== undefined) patch.perKmPkr = input.perKmPkr;
  if (input.perMinPkr !== undefined) patch.perMinPkr = input.perMinPkr;
  if (input.minFarePkr !== undefined) patch.minFarePkr = input.minFarePkr;
  if (Object.keys(patch).length === 0) throw validationError("No fields to update");

  const [updated] = await db
    .update(ridePackages)
    .set(patch)
    .where(eq(ridePackages.id, packageId))
    .returning();
  if (!updated) throw notFound("Package not found");
  return updated;
}

export async function listRides(db: Db, input: ListRidesInput) {
  const whereClause = input.status ? eq(rides.status, input.status) : undefined;

  const rows = await db
    .select({ ride: rides, fare: fares, driverId: rideAssignments.driverId })
    .from(rides)
    .innerJoin(fares, eq(fares.rideId, rides.id))
    .leftJoin(rideAssignments, eq(rideAssignments.rideId, rides.id))
    .where(whereClause)
    .orderBy(desc(rides.requestedAt))
    .limit(input.limit)
    .offset(input.offset);

  const driverIds = [
    ...new Set(rows.map((row) => row.driverId).filter((id): id is string => id !== null)),
  ];
  const driverRows = driverIds.length
    ? await db
        .select({
          id: drivers.userId,
          name: users.name,
          phone: users.phone,
          vehicleCategory: drivers.vehicleCategory,
          vehiclePlate: drivers.vehiclePlate,
        })
        .from(drivers)
        .innerJoin(users, eq(users.id, drivers.userId))
        .where(inArray(drivers.userId, driverIds))
    : [];
  const driverMap = new Map(driverRows.map((driver) => [driver.id, driver]));

  const rideDtos = rows.map((row) =>
    toRideDto({
      ride: row.ride,
      fare: row.fare,
      driver: row.driverId ? (driverMap.get(row.driverId) ?? null) : null,
    }),
  );

  return { rides: rideDtos, limit: input.limit, offset: input.offset };
}
