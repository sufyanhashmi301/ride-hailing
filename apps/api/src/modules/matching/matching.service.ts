import type { RideCategory } from "@ride/contracts";
import { type Db, drivers, fares, rideAssignments, rides, users } from "@ride/db";
import { estimatePickupEtaSeconds, haversineDistanceMeters } from "@ride/domain";
import { and, asc, eq, isNull } from "drizzle-orm";

export interface EligibleDriver {
  userId: string;
  lastLat: number | null;
  lastLng: number | null;
}

/** Drivers online, active, in the right city and category, with no active ride assignment. */
export async function findEligibleDrivers(
  db: Db,
  cityId: string,
  category: RideCategory,
): Promise<EligibleDriver[]> {
  const activeAssignments = db
    .select({ driverId: rideAssignments.driverId })
    .from(rideAssignments)
    .where(isNull(rideAssignments.endedAt))
    .as("active_assignments");

  return db
    .select({ userId: drivers.userId, lastLat: drivers.lastLat, lastLng: drivers.lastLng })
    .from(drivers)
    .innerJoin(users, eq(users.id, drivers.userId))
    .leftJoin(activeAssignments, eq(activeAssignments.driverId, drivers.userId))
    .where(
      and(
        eq(drivers.isOnline, true),
        eq(users.isActive, true),
        eq(drivers.cityId, cityId),
        eq(drivers.vehicleCategory, category),
        isNull(activeAssignments.driverId),
      ),
    );
}

export async function nearestPickupEtaSeconds(
  db: Db,
  cityId: string,
  category: RideCategory,
  pickup: { lat: number; lng: number },
): Promise<number | null> {
  const eligible = await findEligibleDrivers(db, cityId, category);
  const withLocation = eligible.filter(
    (driver): driver is EligibleDriver & { lastLat: number; lastLng: number } =>
      driver.lastLat !== null && driver.lastLng !== null,
  );

  if (withLocation.length === 0) return null;

  const etas = withLocation.map((driver) =>
    estimatePickupEtaSeconds({ lat: driver.lastLat, lng: driver.lastLng }, pickup),
  );
  return Math.min(...etas);
}

export async function findActiveRideIdForDriver(
  db: Db,
  driverId: string,
): Promise<string | undefined> {
  const [row] = await db
    .select({ rideId: rideAssignments.rideId })
    .from(rideAssignments)
    .where(and(eq(rideAssignments.driverId, driverId), isNull(rideAssignments.endedAt)))
    .limit(1);
  return row?.rideId;
}

export interface AvailableRideRow {
  id: string;
  category: RideCategory;
  pickupLat: number;
  pickupLng: number;
  pickupLabel: string;
  dropoffLat: number;
  dropoffLng: number;
  dropoffLabel: string;
  requestedAt: Date;
  fare: {
    distanceM: number;
    durationS: number;
    roadFactor: number;
    avgSpeedKmh: number;
    basePkr: number;
    perKmPkr: number;
    perMinPkr: number;
    minFarePkr: number;
    totalPkr: number;
  };
}

/** Pending rides a given driver is eligible to accept, nearest-pickup-first when location is known. */
export async function findAvailableRidesForDriver(
  db: Db,
  driver: {
    cityId: string;
    vehicleCategory: RideCategory;
    lastLat: number | null;
    lastLng: number | null;
  },
): Promise<AvailableRideRow[]> {
  const rows = await db
    .select({
      id: rides.id,
      category: rides.category,
      pickupLat: rides.pickupLat,
      pickupLng: rides.pickupLng,
      pickupLabel: rides.pickupLabel,
      dropoffLat: rides.dropoffLat,
      dropoffLng: rides.dropoffLng,
      dropoffLabel: rides.dropoffLabel,
      requestedAt: rides.requestedAt,
      fare: {
        distanceM: fares.distanceM,
        durationS: fares.durationS,
        roadFactor: fares.roadFactor,
        avgSpeedKmh: fares.avgSpeedKmh,
        basePkr: fares.basePkr,
        perKmPkr: fares.perKmPkr,
        perMinPkr: fares.perMinPkr,
        minFarePkr: fares.minFarePkr,
        totalPkr: fares.totalPkr,
      },
    })
    .from(rides)
    .innerJoin(fares, eq(fares.rideId, rides.id))
    .where(
      and(
        eq(rides.status, "requested"),
        eq(rides.cityId, driver.cityId),
        eq(rides.category, driver.vehicleCategory),
      ),
    )
    .orderBy(asc(rides.requestedAt))
    .limit(20);

  if (driver.lastLat === null || driver.lastLng === null) {
    return rows;
  }

  const origin = { lat: driver.lastLat, lng: driver.lastLng };
  return [...rows].sort(
    (a, b) =>
      haversineDistanceMeters(origin, { lat: a.pickupLat, lng: a.pickupLng }) -
      haversineDistanceMeters(origin, { lat: b.pickupLat, lng: b.pickupLng }),
  );
}
