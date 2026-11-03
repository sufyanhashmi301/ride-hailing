import { randomUUID } from "node:crypto";
import { createDb, ridePackages } from "@ride/db";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestApp, stopTestApp, type TestApp } from "./helpers/app.js";
import { bearer, loginAs } from "./helpers/auth.js";
import { seedCity, seedPackages, seedUser } from "./helpers/fixtures.js";

const PICKUP = { lat: 31.5204, lng: 74.3587, label: "Liberty Market" };
const DROPOFF = { lat: 31.5304, lng: 74.3587, label: "Packages Mall" };

describe("admin routes", () => {
  let testApp: TestApp;
  let app: FastifyInstance;
  let db: ReturnType<typeof createDb>;
  let cityId: string;
  let adminToken: string;

  beforeAll(async () => {
    testApp = await startTestApp();
    app = testApp.app;
    db = createDb(testApp.databaseUrl);

    const city = await seedCity(db);
    cityId = city.id;
    await seedPackages(db, cityId);

    const admin = await seedUser(db, "admin");
    adminToken = await loginAs(app, admin.email);
  }, 60_000);

  afterAll(async () => {
    await db.$client.end();
    await stopTestApp(testApp);
  });

  function newDriverPayload(overrides: Record<string, unknown> = {}) {
    return {
      name: "New Driver",
      email: `driver-${randomUUID()}@test.local`,
      cityId,
      vehicleCategory: "economy" as const,
      vehiclePlate: `LEA-${randomUUID().slice(0, 6)}`,
      ...overrides,
    };
  }

  describe("POST /admin/drivers", () => {
    it("creates a driver with a temporary password the driver can log in with", async () => {
      const payload = newDriverPayload();

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/admin/drivers",
        headers: bearer(adminToken),
        payload,
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.driver.email).toBe(payload.email);
      expect(body.driver.isOnline).toBe(false);
      expect(body.driver.isActive).toBe(true);
      expect(typeof body.temporaryPassword).toBe("string");
      expect(body.temporaryPassword.length).toBeGreaterThan(0);

      const login = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { email: payload.email, password: body.temporaryPassword },
      });
      expect(login.statusCode).toBe(200);
      expect(login.json().user.role).toBe("driver");
    });

    it("rejects non-admin callers", async () => {
      const rider = await seedUser(db, "rider");
      const token = await loginAs(app, rider.email);

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/admin/drivers",
        headers: bearer(token),
        payload: newDriverPayload(),
      });

      expect(response.statusCode).toBe(403);
    });

    it("returns 409 EMAIL_ALREADY_EXISTS for a duplicate email", async () => {
      const existing = await seedUser(db, "rider");

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/admin/drivers",
        headers: bearer(adminToken),
        payload: newDriverPayload({ email: existing.email }),
      });

      expect(response.statusCode).toBe(409);
      expect(response.json().error.code).toBe("EMAIL_ALREADY_EXISTS");
    });

    it("returns 409 VEHICLE_PLATE_ALREADY_EXISTS for a duplicate vehicle plate", async () => {
      const plate = `DUP-${randomUUID().slice(0, 6)}`;
      const first = await app.inject({
        method: "POST",
        url: "/api/v1/admin/drivers",
        headers: bearer(adminToken),
        payload: newDriverPayload({ vehiclePlate: plate }),
      });
      expect(first.statusCode).toBe(201);

      const second = await app.inject({
        method: "POST",
        url: "/api/v1/admin/drivers",
        headers: bearer(adminToken),
        payload: newDriverPayload({ vehiclePlate: plate }),
      });

      expect(second.statusCode).toBe(409);
      expect(second.json().error.code).toBe("VEHICLE_PLATE_ALREADY_EXISTS");
    });
  });

  describe("GET /admin/drivers", () => {
    it("lists created drivers", async () => {
      const create = await app.inject({
        method: "POST",
        url: "/api/v1/admin/drivers",
        headers: bearer(adminToken),
        payload: newDriverPayload(),
      });
      const { driver } = create.json();

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/admin/drivers",
        headers: bearer(adminToken),
      });

      expect(response.statusCode).toBe(200);
      const ids = response.json().drivers.map((d: { userId: string }) => d.userId);
      expect(ids).toContain(driver.userId);
    });

    it("rejects non-admin callers", async () => {
      const rider = await seedUser(db, "rider");
      const token = await loginAs(app, rider.email);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/admin/drivers",
        headers: bearer(token),
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("GET /admin/cities", () => {
    it("lists active cities", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/admin/cities",
        headers: bearer(adminToken),
      });

      expect(response.statusCode).toBe(200);
      const ids = response.json().cities.map((c: { id: string }) => c.id);
      expect(ids).toContain(cityId);
    });

    it("rejects non-admin callers", async () => {
      const rider = await seedUser(db, "rider");
      const token = await loginAs(app, rider.email);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/admin/cities",
        headers: bearer(token),
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("PATCH /admin/drivers/:id", () => {
    it("disables a driver so they can no longer log in", async () => {
      const create = await app.inject({
        method: "POST",
        url: "/api/v1/admin/drivers",
        headers: bearer(adminToken),
        payload: newDriverPayload(),
      });
      const { driver, temporaryPassword } = create.json();

      const response = await app.inject({
        method: "PATCH",
        url: `/api/v1/admin/drivers/${driver.userId}`,
        headers: bearer(adminToken),
        payload: { isActive: false },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().driver.isActive).toBe(false);

      const login = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { email: driver.email, password: temporaryPassword },
      });
      expect(login.statusCode).toBe(401);
    });

    it("returns 404 for an unknown driver", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: `/api/v1/admin/drivers/${randomUUID()}`,
        headers: bearer(adminToken),
        payload: { isActive: false },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("PATCH /admin/packages/:id", () => {
    it("updates pricing and the new fare estimate reflects it", async () => {
      const packages = await db.select().from(ridePackages).where(eq(ridePackages.cityId, cityId));
      const economyPkg = packages.find((row) => row.category === "economy");
      if (!economyPkg) throw new Error("expected a seeded economy package");

      const rider = await seedUser(db, "rider");
      const riderToken = await loginAs(app, rider.email);
      const beforeEstimate = await app.inject({
        method: "POST",
        url: "/api/v1/rides/estimate",
        headers: bearer(riderToken),
        payload: { pickup: PICKUP, dropoff: DROPOFF },
      });
      expect(beforeEstimate.statusCode).toBe(200);
      const beforeFare = beforeEstimate
        .json()
        .estimates.find((e: { category: string }) => e.category === "economy").fare.totalPkr;

      const response = await app.inject({
        method: "PATCH",
        url: `/api/v1/admin/packages/${economyPkg.id}`,
        headers: bearer(adminToken),
        payload: { baseFarePkr: economyPkg.baseFarePkr + 10_000 },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json().package.baseFarePkr).toBe(economyPkg.baseFarePkr + 10_000);

      const afterEstimate = await app.inject({
        method: "POST",
        url: "/api/v1/rides/estimate",
        headers: bearer(riderToken),
        payload: { pickup: PICKUP, dropoff: DROPOFF },
      });
      const afterFare = afterEstimate
        .json()
        .estimates.find((e: { category: string }) => e.category === "economy").fare.totalPkr;

      expect(afterFare).toBe(beforeFare + 10_000);
    });

    it("returns 400 when no fields are provided", async () => {
      const [pkg] = await db.select().from(ridePackages).where(eq(ridePackages.cityId, cityId));
      if (!pkg) throw new Error("expected a seeded package");

      const response = await app.inject({
        method: "PATCH",
        url: `/api/v1/admin/packages/${pkg.id}`,
        headers: bearer(adminToken),
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("GET /admin/rides", () => {
    it("lists rides filtered by status", async () => {
      const rider = await seedUser(db, "rider");
      const riderToken = await loginAs(app, rider.email);

      const created = await app.inject({
        method: "POST",
        url: "/api/v1/rides",
        headers: { ...bearer(riderToken), "idempotency-key": randomUUID() },
        payload: { category: "economy", pickup: PICKUP, dropoff: DROPOFF },
      });
      expect(created.statusCode).toBe(201);
      const ride = created.json();

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/admin/rides?status=requested&limit=50",
        headers: bearer(adminToken),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.rides.map((r: { id: string }) => r.id)).toContain(ride.id);
      expect(body.rides.every((r: { status: string }) => r.status === "requested")).toBe(true);
    });

    it("rejects non-admin callers", async () => {
      const rider = await seedUser(db, "rider");
      const token = await loginAs(app, rider.email);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/admin/rides",
        headers: bearer(token),
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("GET /admin/stats", () => {
    it("counts a newly requested ride under its status", async () => {
      const rider = await seedUser(db, "rider");
      const riderToken = await loginAs(app, rider.email);

      const before = await app.inject({
        method: "GET",
        url: "/api/v1/admin/stats",
        headers: bearer(adminToken),
      });
      const beforeRequested = before.json().rideStatusCounts.requested;

      const created = await app.inject({
        method: "POST",
        url: "/api/v1/rides",
        headers: { ...bearer(riderToken), "idempotency-key": randomUUID() },
        payload: { category: "economy", pickup: PICKUP, dropoff: DROPOFF },
      });
      expect(created.statusCode).toBe(201);

      const after = await app.inject({
        method: "GET",
        url: "/api/v1/admin/stats",
        headers: bearer(adminToken),
      });

      expect(after.statusCode).toBe(200);
      expect(after.json().rideStatusCounts.requested).toBe(beforeRequested + 1);
    });

    it("rejects non-admin callers", async () => {
      const rider = await seedUser(db, "rider");
      const token = await loginAs(app, rider.email);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/admin/stats",
        headers: bearer(token),
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
