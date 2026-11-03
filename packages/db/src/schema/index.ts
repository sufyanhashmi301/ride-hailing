import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export type UserRole = "rider" | "driver" | "admin";
export type RideCategory = "economy" | "comfort";
export type RideStatus = "requested" | "accepted" | "completed" | "cancelled" | "expired";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull().$type<UserRole>(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_users_email").on(table.email),
    check("ck_users_role", sql`${table.role} in ('rider', 'driver', 'admin')`),
  ],
);

export const cities = pgTable(
  "cities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    minLat: doublePrecision("min_lat").notNull(),
    maxLat: doublePrecision("max_lat").notNull(),
    minLng: doublePrecision("min_lng").notNull(),
    maxLng: doublePrecision("max_lng").notNull(),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => [uniqueIndex("uq_cities_slug").on(table.slug)],
);

export const drivers = pgTable(
  "drivers",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id),
    cityId: uuid("city_id")
      .notNull()
      .references(() => cities.id),
    vehicleCategory: text("vehicle_category").notNull().$type<RideCategory>(),
    vehiclePlate: text("vehicle_plate").notNull(),
    isOnline: boolean("is_online").notNull().default(false),
    lastLat: doublePrecision("last_lat"),
    lastLng: doublePrecision("last_lng"),
    locationUpdatedAt: timestamp("location_updated_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("uq_drivers_vehicle_plate").on(table.vehiclePlate),
    index("idx_drivers_city_id").on(table.cityId),
    check("ck_drivers_vehicle_category", sql`${table.vehicleCategory} in ('economy', 'comfort')`),
  ],
);

export const ridePackages = pgTable(
  "ride_packages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cityId: uuid("city_id")
      .notNull()
      .references(() => cities.id),
    category: text("category").notNull().$type<RideCategory>(),
    baseFarePkr: integer("base_fare_pkr").notNull(),
    perKmPkr: integer("per_km_pkr").notNull(),
    perMinPkr: integer("per_min_pkr").notNull(),
    minFarePkr: integer("min_fare_pkr").notNull(),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => [
    uniqueIndex("uq_ride_packages_city_category").on(table.cityId, table.category),
    check("ck_ride_packages_category", sql`${table.category} in ('economy', 'comfort')`),
  ],
);

export const rides = pgTable(
  "rides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    riderId: uuid("rider_id")
      .notNull()
      .references(() => users.id),
    cityId: uuid("city_id")
      .notNull()
      .references(() => cities.id),
    category: text("category").notNull().$type<RideCategory>(),
    status: text("status").notNull().$type<RideStatus>().default("requested"),
    pickupLat: doublePrecision("pickup_lat").notNull(),
    pickupLng: doublePrecision("pickup_lng").notNull(),
    pickupLabel: text("pickup_label").notNull(),
    dropoffLat: doublePrecision("dropoff_lat").notNull(),
    dropoffLng: doublePrecision("dropoff_lng").notNull(),
    dropoffLabel: text("dropoff_label").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    requestHash: text("request_hash").notNull(),
    version: integer("version").notNull().default(1),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelledBy: uuid("cancelled_by").references(() => users.id),
    cancelReason: text("cancel_reason"),
  },
  (table) => [
    uniqueIndex("uq_rides_rider_idempotency_key").on(table.riderId, table.idempotencyKey),
    uniqueIndex("uq_rides_active_per_rider")
      .on(table.riderId)
      .where(sql`${table.status} in ('requested', 'accepted')`),
    index("idx_rides_status").on(table.status),
    check("ck_rides_category", sql`${table.category} in ('economy', 'comfort')`),
    check(
      "ck_rides_status",
      sql`${table.status} in ('requested', 'accepted', 'completed', 'cancelled', 'expired')`,
    ),
  ],
);

export const rideAssignments = pgTable(
  "ride_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    rideId: uuid("ride_id")
      .notNull()
      .references(() => rides.id),
    driverId: uuid("driver_id")
      .notNull()
      .references(() => drivers.userId),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    endReason: text("end_reason"),
  },
  (table) => [
    uniqueIndex("uq_ride_assignments_active_per_ride")
      .on(table.rideId)
      .where(sql`${table.endedAt} is null`),
    uniqueIndex("uq_ride_assignments_active_per_driver")
      .on(table.driverId)
      .where(sql`${table.endedAt} is null`),
  ],
);

export const fares = pgTable("fares", {
  rideId: uuid("ride_id")
    .primaryKey()
    .references(() => rides.id),
  distanceM: integer("distance_m").notNull(),
  durationS: integer("duration_s").notNull(),
  roadFactor: doublePrecision("road_factor").notNull(),
  avgSpeedKmh: doublePrecision("avg_speed_kmh").notNull(),
  basePkr: integer("base_pkr").notNull(),
  perKmPkr: integer("per_km_pkr").notNull(),
  perMinPkr: integer("per_min_pkr").notNull(),
  minFarePkr: integer("min_fare_pkr").notNull(),
  totalPkr: integer("total_pkr").notNull(),
});

export const places = pgTable(
  "places",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cityId: uuid("city_id")
      .notNull()
      .references(() => cities.id),
    name: text("name").notNull(),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
  },
  (table) => [index("idx_places_city_id").on(table.cityId)],
);
