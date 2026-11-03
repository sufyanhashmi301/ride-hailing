CREATE TABLE "cities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"min_lat" double precision NOT NULL,
	"max_lat" double precision NOT NULL,
	"min_lng" double precision NOT NULL,
	"max_lng" double precision NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drivers" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"city_id" uuid NOT NULL,
	"vehicle_category" text NOT NULL,
	"vehicle_plate" text NOT NULL,
	"is_online" boolean DEFAULT false NOT NULL,
	"last_lat" double precision,
	"last_lng" double precision,
	"location_updated_at" timestamp with time zone,
	CONSTRAINT "ck_drivers_vehicle_category" CHECK ("drivers"."vehicle_category" in ('economy', 'comfort'))
);
--> statement-breakpoint
CREATE TABLE "fares" (
	"ride_id" uuid PRIMARY KEY NOT NULL,
	"distance_m" integer NOT NULL,
	"duration_s" integer NOT NULL,
	"road_factor" double precision NOT NULL,
	"avg_speed_kmh" double precision NOT NULL,
	"base_pkr" integer NOT NULL,
	"per_km_pkr" integer NOT NULL,
	"per_min_pkr" integer NOT NULL,
	"min_fare_pkr" integer NOT NULL,
	"total_pkr" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "places" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"city_id" uuid NOT NULL,
	"name" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ride_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ride_id" uuid NOT NULL,
	"driver_id" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"end_reason" text
);
--> statement-breakpoint
CREATE TABLE "ride_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"city_id" uuid NOT NULL,
	"category" text NOT NULL,
	"base_fare_pkr" integer NOT NULL,
	"per_km_pkr" integer NOT NULL,
	"per_min_pkr" integer NOT NULL,
	"min_fare_pkr" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "ck_ride_packages_category" CHECK ("ride_packages"."category" in ('economy', 'comfort'))
);
--> statement-breakpoint
CREATE TABLE "rides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rider_id" uuid NOT NULL,
	"city_id" uuid NOT NULL,
	"category" text NOT NULL,
	"status" text DEFAULT 'requested' NOT NULL,
	"pickup_lat" double precision NOT NULL,
	"pickup_lng" double precision NOT NULL,
	"pickup_label" text NOT NULL,
	"dropoff_lat" double precision NOT NULL,
	"dropoff_lng" double precision NOT NULL,
	"dropoff_label" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_hash" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancelled_by" uuid,
	"cancel_reason" text,
	CONSTRAINT "ck_rides_category" CHECK ("rides"."category" in ('economy', 'comfort')),
	CONSTRAINT "ck_rides_status" CHECK ("rides"."status" in ('requested', 'accepted', 'completed', 'cancelled', 'expired'))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"password_hash" text NOT NULL,
	"role" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_users_role" CHECK ("users"."role" in ('rider', 'driver', 'admin'))
);
--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fares" ADD CONSTRAINT "fares_ride_id_rides_id_fk" FOREIGN KEY ("ride_id") REFERENCES "public"."rides"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ride_assignments" ADD CONSTRAINT "ride_assignments_ride_id_rides_id_fk" FOREIGN KEY ("ride_id") REFERENCES "public"."rides"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ride_assignments" ADD CONSTRAINT "ride_assignments_driver_id_drivers_user_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ride_packages" ADD CONSTRAINT "ride_packages_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rides" ADD CONSTRAINT "rides_rider_id_users_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rides" ADD CONSTRAINT "rides_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rides" ADD CONSTRAINT "rides_cancelled_by_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_cities_slug" ON "cities" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_drivers_vehicle_plate" ON "drivers" USING btree ("vehicle_plate");--> statement-breakpoint
CREATE INDEX "idx_drivers_city_id" ON "drivers" USING btree ("city_id");--> statement-breakpoint
CREATE INDEX "idx_places_city_id" ON "places" USING btree ("city_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_ride_assignments_active_per_ride" ON "ride_assignments" USING btree ("ride_id") WHERE "ride_assignments"."ended_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_ride_assignments_active_per_driver" ON "ride_assignments" USING btree ("driver_id") WHERE "ride_assignments"."ended_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_ride_packages_city_category" ON "ride_packages" USING btree ("city_id","category");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_rides_rider_idempotency_key" ON "rides" USING btree ("rider_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_rides_active_per_rider" ON "rides" USING btree ("rider_id") WHERE "rides"."status" in ('requested', 'accepted');--> statement-breakpoint
CREATE INDEX "idx_rides_status" ON "rides" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_users_email" ON "users" USING btree ("email");