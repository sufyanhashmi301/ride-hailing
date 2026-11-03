import { createHash } from "node:crypto";
import type { Ride, RideCategory, RideLocation } from "@ride/contracts";
import {
  cities,
  type Db,
  type RideStatus as DbRideStatus,
  drivers,
  fares,
  rideAssignments,
  ridePackages,
  rides,
  users,
} from "@ride/db";
import {
  type Actor,
  estimateFare,
  type GeoPoint,
  type InvalidRideTransitionError,
  isWithinBounds,
  transition,
} from "@ride/domain";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import {
  ApiError,
  activeRideExists,
  forbidden,
  idempotencyKeyReused,
  notFound,
  outsideServiceArea,
  validationError,
} from "../../lib/api-error.js";
import { isUniqueViolation } from "../../lib/postgres-errors.js";
import { acceptRideTransaction } from "../matching/driver.repository.js";
import { nearestPickupEtaSeconds } from "../matching/matching.service.js";

export interface EstimateInput {
  pickup: RideLocation;
  dropoff: RideLocation;
}

export interface CreateRideInput {
  category: RideCategory;
  pickup: RideLocation;
  dropoff: RideLocation;
}

export interface RequesterContext {
  id: string;
  role: "rider" | "driver" | "admin";
}

interface RideDetail {
  ride: typeof rides.$inferSelect;
  fare: typeof fares.$inferSelect;
  driver: {
    id: string;
    name: string;
    phone: string | null;
    vehicleCategory: RideCategory;
    vehiclePlate: string;
  } | null;
}

async function findCityForPoint(db: Db, point: GeoPoint) {
  const activeCities = await db.select().from(cities).where(eq(cities.isActive, true));
  return activeCities.find((city) =>
    isWithinBounds(point, {
      minLat: city.minLat,
      maxLat: city.maxLat,
      minLng: city.minLng,
      maxLng: city.maxLng,
    }),
  );
}

function hashRequestBody(input: CreateRideInput): string {
  const canonical = JSON.stringify({
    category: input.category,
    pickup: { lat: input.pickup.lat, lng: input.pickup.lng, label: input.pickup.label },
    dropoff: { lat: input.dropoff.lat, lng: input.dropoff.lng, label: input.dropoff.label },
  });
  return createHash("sha256").update(canonical).digest("hex");
}

export async function estimateRide(db: Db, input: EstimateInput) {
  const city = await findCityForPoint(db, input.pickup);
  if (!city) throw outsideServiceArea();
  if (!isWithinBounds(input.dropoff, city)) throw outsideServiceArea();

  const packages = await db
    .select()
    .from(ridePackages)
    .where(and(eq(ridePackages.cityId, city.id), eq(ridePackages.isActive, true)));

  const estimates = await Promise.all(
    packages.map(async (pkg) => {
      const fare = estimateFare(input.pickup, input.dropoff, pkg);
      const pickupEtaSeconds = await nearestPickupEtaSeconds(
        db,
        city.id,
        pkg.category,
        input.pickup,
      );
      return { category: pkg.category, fare, pickupEtaSeconds };
    }),
  );

  return { cityId: city.id, estimates };
}

async function loadRideDetail(db: Db, rideId: string): Promise<RideDetail | undefined> {
  const [row] = await db
    .select({
      ride: rides,
      fare: fares,
      driverId: rideAssignments.driverId,
    })
    .from(rides)
    .innerJoin(fares, eq(fares.rideId, rides.id))
    .leftJoin(rideAssignments, eq(rideAssignments.rideId, rides.id))
    .where(eq(rides.id, rideId))
    .limit(1);

  if (!row) return undefined;

  if (!row.driverId) {
    return { ride: row.ride, fare: row.fare, driver: null };
  }

  const [driverRow] = await db
    .select({
      id: drivers.userId,
      name: users.name,
      phone: users.phone,
      vehicleCategory: drivers.vehicleCategory,
      vehiclePlate: drivers.vehiclePlate,
    })
    .from(drivers)
    .innerJoin(users, eq(users.id, drivers.userId))
    .where(eq(drivers.userId, row.driverId))
    .limit(1);

  return { ride: row.ride, fare: row.fare, driver: driverRow ?? null };
}

export function toRideDto(detail: RideDetail): Ride {
  const { ride, fare, driver } = detail;
  return {
    id: ride.id,
    riderId: ride.riderId,
    cityId: ride.cityId,
    category: ride.category,
    status: ride.status,
    pickup: { lat: ride.pickupLat, lng: ride.pickupLng, label: ride.pickupLabel },
    dropoff: { lat: ride.dropoffLat, lng: ride.dropoffLng, label: ride.dropoffLabel },
    fare: {
      distanceM: fare.distanceM,
      durationS: fare.durationS,
      roadFactor: fare.roadFactor,
      avgSpeedKmh: fare.avgSpeedKmh,
      basePkr: fare.basePkr,
      perKmPkr: fare.perKmPkr,
      perMinPkr: fare.perMinPkr,
      minFarePkr: fare.minFarePkr,
      totalPkr: fare.totalPkr,
    },
    driver,
    requestedAt: ride.requestedAt.toISOString(),
    acceptedAt: ride.acceptedAt?.toISOString() ?? null,
    completedAt: ride.completedAt?.toISOString() ?? null,
    cancelledAt: ride.cancelledAt?.toISOString() ?? null,
    cancelledBy: ride.cancelledBy ?? null,
    cancelReason: ride.cancelReason ?? null,
  };
}

async function requireRideDetail(db: Db, rideId: string): Promise<RideDetail> {
  const detail = await loadRideDetail(db, rideId);
  if (!detail) throw notFound("Ride not found");
  return detail;
}

const ACTIVE_RIDE_STATUSES: DbRideStatus[] = ["requested", "accepted"];

export async function createRide(
  db: Db,
  rider: RequesterContext,
  idempotencyKey: string,
  input: CreateRideInput,
): Promise<{ detail: RideDetail; created: boolean }> {
  const city = await findCityForPoint(db, input.pickup);
  if (!city) throw outsideServiceArea();
  if (!isWithinBounds(input.dropoff, city)) throw outsideServiceArea();

  const requestHash = hashRequestBody(input);

  let rideId: string;
  let created: boolean;

  try {
    const result = await db.transaction(async (tx) => {
      // A single query for both checks: reading them as two separate statements would let a
      // commit land in the gap between them, so a late duplicate's first check (idempotency key)
      // misses the winner but its second check (active ride) then sees that same winning row and
      // misreads its own duplicate as a conflicting ride.
      const conflicts = await tx
        .select({
          id: rides.id,
          idempotencyKey: rides.idempotencyKey,
          requestHash: rides.requestHash,
        })
        .from(rides)
        .where(
          and(
            eq(rides.riderId, rider.id),
            or(
              eq(rides.idempotencyKey, idempotencyKey),
              inArray(rides.status, ACTIVE_RIDE_STATUSES),
            ),
          ),
        );

      const existing = conflicts.find((row) => row.idempotencyKey === idempotencyKey);
      if (existing) {
        if (existing.requestHash !== requestHash) throw idempotencyKeyReused();
        return { rideId: existing.id, created: false };
      }
      if (conflicts.length > 0) throw activeRideExists();

      const [pkg] = await tx
        .select()
        .from(ridePackages)
        .where(
          and(
            eq(ridePackages.cityId, city.id),
            eq(ridePackages.category, input.category),
            eq(ridePackages.isActive, true),
          ),
        )
        .limit(1);
      if (!pkg) {
        throw validationError(`No active ${input.category} package in this city`);
      }

      const fareEstimate = estimateFare(input.pickup, input.dropoff, pkg);

      const [ride] = await tx
        .insert(rides)
        .values({
          riderId: rider.id,
          cityId: city.id,
          category: input.category,
          pickupLat: input.pickup.lat,
          pickupLng: input.pickup.lng,
          pickupLabel: input.pickup.label,
          dropoffLat: input.dropoff.lat,
          dropoffLng: input.dropoff.lng,
          dropoffLabel: input.dropoff.label,
          idempotencyKey,
          requestHash,
        })
        .returning();
      if (!ride) throw new Error("ride insert returned no row");

      await tx.insert(fares).values({ rideId: ride.id, ...fareEstimate });

      return { rideId: ride.id, created: true };
    });
    rideId = result.rideId;
    created = result.created;
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;

    // Lost a race to a concurrent request. The failed insert aborted that transaction (Postgres
    // rejects further statements on it), so resolve the race in a fresh query instead of reusing
    // `tx`, the same way a sequential retry would.
    const [raced] = await db
      .select()
      .from(rides)
      .where(and(eq(rides.riderId, rider.id), eq(rides.idempotencyKey, idempotencyKey)))
      .limit(1);
    if (!raced) throw activeRideExists();
    if (raced.requestHash !== requestHash) throw idempotencyKeyReused();
    rideId = raced.id;
    created = false;
  }

  const detail = await requireRideDetail(db, rideId);
  return { detail, created };
}

export async function getRide(
  db: Db,
  rideId: string,
  requester: RequesterContext,
): Promise<RideDetail> {
  const detail = await requireRideDetail(db, rideId);

  const isOwner = detail.ride.riderId === requester.id;
  const isAssignedDriver = detail.driver?.id === requester.id;
  const isAdmin = requester.role === "admin";
  if (!isOwner && !isAssignedDriver && !isAdmin) {
    throw forbidden("You do not have access to this ride");
  }

  return detail;
}

function toInvalidTransitionApiError(error: InvalidRideTransitionError): ApiError {
  return new ApiError(409, "INVALID_TRANSITION", error.message, {
    from: error.from,
    to: error.to,
    action: error.action,
  });
}

export async function cancelRide(
  db: Db,
  rideId: string,
  actor: RequesterContext,
  reason: string | undefined,
): Promise<RideDetail> {
  await db.transaction(async (tx) => {
    const [ride] = await tx.select().from(rides).where(eq(rides.id, rideId)).for("update");
    if (!ride) throw notFound("Ride not found");

    const isOwner = ride.riderId === actor.id;
    const isAdmin = actor.role === "admin";
    if (!isOwner && !isAdmin) throw forbidden("You do not have access to cancel this ride");

    const domainActor: Actor = { role: actor.role, userId: actor.id };
    const result = transition(ride, "cancel", domainActor);
    if (!result.ok) throw toInvalidTransitionApiError(result.error);

    await tx
      .update(rides)
      .set({
        status: result.ride.status,
        cancelledAt: result.ride.cancelledAt,
        cancelledBy: result.ride.cancelledBy,
        cancelReason: reason ?? null,
      })
      .where(eq(rides.id, rideId));

    await tx
      .update(rideAssignments)
      .set({
        endedAt: new Date(),
        endReason: isAdmin ? "admin_cancelled" : "rider_cancelled",
      })
      .where(and(eq(rideAssignments.rideId, rideId), isNull(rideAssignments.endedAt)));
  });

  return requireRideDetail(db, rideId);
}

export async function completeRide(db: Db, rideId: string, driverId: string): Promise<RideDetail> {
  await db.transaction(async (tx) => {
    const [ride] = await tx.select().from(rides).where(eq(rides.id, rideId)).for("update");
    if (!ride) throw notFound("Ride not found");

    const [assignment] = await tx
      .select()
      .from(rideAssignments)
      .where(and(eq(rideAssignments.rideId, rideId), isNull(rideAssignments.endedAt)))
      .limit(1);
    if (!assignment || assignment.driverId !== driverId) {
      throw forbidden("You are not the assigned driver for this ride");
    }

    const domainActor: Actor = { role: "driver", userId: driverId };
    const result = transition(ride, "complete", domainActor);
    if (!result.ok) throw toInvalidTransitionApiError(result.error);

    await tx
      .update(rides)
      .set({ status: result.ride.status, completedAt: result.ride.completedAt })
      .where(eq(rides.id, rideId));

    await tx
      .update(rideAssignments)
      .set({ endedAt: new Date(), endReason: "completed" })
      .where(eq(rideAssignments.id, assignment.id));
  });

  return requireRideDetail(db, rideId);
}

export async function acceptRide(db: Db, rideId: string, driverId: string): Promise<RideDetail> {
  const outcome = await acceptRideTransaction(db, rideId, driverId);

  switch (outcome.outcome) {
    case "accepted":
      return requireRideDetail(db, rideId);
    case "ride_not_found":
      throw notFound("Ride not found");
    case "ride_already_accepted":
      throw new ApiError(409, "RIDE_ALREADY_ACCEPTED", "This ride has already been accepted");
    case "driver_busy":
      throw new ApiError(409, "DRIVER_BUSY", "You already have an active ride assignment");
    case "driver_not_eligible":
      throw new ApiError(422, "DRIVER_NOT_ELIGIBLE", outcome.reason);
  }
}
