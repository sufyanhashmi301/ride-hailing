import { randomUUID } from "node:crypto";
import { createDb } from "@ride/db";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestApp, stopTestApp, type TestApp } from "./helpers/app.js";
import { bearer, loginAs } from "./helpers/auth.js";
import { seedCity, seedPackages, seedUser } from "./helpers/fixtures.js";

const PICKUP = { lat: 31.5204, lng: 74.3587, label: "Liberty Market" };
const DROPOFF = { lat: 31.5304, lng: 74.3587, label: "Packages Mall" };
const OUTSIDE_LAHORE = { lat: 24.86, lng: 67.01, label: "Karachi" };

function rideBody(
  overrides: Partial<{ category: string; pickup: typeof PICKUP; dropoff: typeof DROPOFF }> = {},
) {
  return { category: "economy", pickup: PICKUP, dropoff: DROPOFF, ...overrides };
}

describe("ride routes", () => {
  let testApp: TestApp;
  let app: FastifyInstance;
  let db: ReturnType<typeof createDb>;

  beforeAll(async () => {
    testApp = await startTestApp();
    app = testApp.app;
    db = createDb(testApp.databaseUrl);

    const city = await seedCity(db);
    await seedPackages(db, city.id);
  }, 60_000);

  afterAll(async () => {
    await db.$client.end();
    await stopTestApp(testApp);
  });

  async function riderToken() {
    const rider = await seedUser(db, "rider");
    const token = await loginAs(app, rider.email);
    return { rider, token };
  }

  describe("POST /rides/estimate", () => {
    it("returns fare and ETA estimates for both categories", async () => {
      const { token } = await riderToken();

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/rides/estimate",
        headers: bearer(token),
        payload: { pickup: PICKUP, dropoff: DROPOFF },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.estimates).toHaveLength(2);
      const categories = body.estimates.map((e: { category: string }) => e.category).sort();
      expect(categories).toEqual(["comfort", "economy"]);
      for (const estimate of body.estimates) {
        expect(estimate.fare.totalPkr).toBeGreaterThan(0);
        expect(estimate.pickupEtaSeconds).toBeNull();
      }
    });

    it("rejects drivers and admins (rider-only)", async () => {
      const driver = await seedUser(db, "driver");
      const token = await loginAs(app, driver.email);

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/rides/estimate",
        headers: bearer(token),
        payload: { pickup: PICKUP, dropoff: DROPOFF },
      });

      expect(response.statusCode).toBe(403);
    });

    it("returns 400 OUTSIDE_SERVICE_AREA when pickup is outside Lahore", async () => {
      const { token } = await riderToken();

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/rides/estimate",
        headers: bearer(token),
        payload: { pickup: OUTSIDE_LAHORE, dropoff: DROPOFF },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe("OUTSIDE_SERVICE_AREA");
    });

    it("returns 400 when pickup and dropoff are the same point", async () => {
      const { token } = await riderToken();

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/rides/estimate",
        headers: bearer(token),
        payload: { pickup: PICKUP, dropoff: PICKUP },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("POST /rides", () => {
    it("requires an Idempotency-Key header", async () => {
      const { token } = await riderToken();

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/rides",
        headers: bearer(token),
        payload: rideBody(),
      });

      expect(response.statusCode).toBe(400);
    });

    it("creates a ride and stores a fare snapshot", async () => {
      const { token } = await riderToken();

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/rides",
        headers: { ...bearer(token), "idempotency-key": randomUUID() },
        payload: rideBody(),
      });

      expect(response.statusCode).toBe(201);
      const ride = response.json();
      expect(ride.status).toBe("requested");
      expect(ride.fare.totalPkr).toBeGreaterThan(0);
      expect(ride.driver).toBeNull();
    });

    it("rejects bad input: same pickup and dropoff", async () => {
      const { token } = await riderToken();

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/rides",
        headers: { ...bearer(token), "idempotency-key": randomUUID() },
        payload: rideBody({ pickup: PICKUP, dropoff: PICKUP }),
      });

      expect(response.statusCode).toBe(400);
    });

    it("rejects bad input: unknown category", async () => {
      const { token } = await riderToken();

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/rides",
        headers: { ...bearer(token), "idempotency-key": randomUUID() },
        payload: rideBody({ category: "luxury" }),
      });

      expect(response.statusCode).toBe(400);
    });

    it("rejects pickup outside the service area", async () => {
      const { token } = await riderToken();

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/rides",
        headers: { ...bearer(token), "idempotency-key": randomUUID() },
        payload: rideBody({ pickup: OUTSIDE_LAHORE }),
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe("OUTSIDE_SERVICE_AREA");
    });

    it("same key and same body returns the original ride with 200", async () => {
      const { token } = await riderToken();
      const idempotencyKey = randomUUID();

      const first = await app.inject({
        method: "POST",
        url: "/api/v1/rides",
        headers: { ...bearer(token), "idempotency-key": idempotencyKey },
        payload: rideBody(),
      });
      expect(first.statusCode).toBe(201);

      const second = await app.inject({
        method: "POST",
        url: "/api/v1/rides",
        headers: { ...bearer(token), "idempotency-key": idempotencyKey },
        payload: rideBody(),
      });

      expect(second.statusCode).toBe(200);
      expect(second.json().id).toBe(first.json().id);
    });

    it("same key with a different body returns 409 IDEMPOTENCY_KEY_REUSED", async () => {
      const { token } = await riderToken();
      const idempotencyKey = randomUUID();

      const first = await app.inject({
        method: "POST",
        url: "/api/v1/rides",
        headers: { ...bearer(token), "idempotency-key": idempotencyKey },
        payload: rideBody(),
      });
      expect(first.statusCode).toBe(201);

      const second = await app.inject({
        method: "POST",
        url: "/api/v1/rides",
        headers: { ...bearer(token), "idempotency-key": idempotencyKey },
        payload: rideBody({ category: "comfort" }),
      });

      expect(second.statusCode).toBe(409);
      expect(second.json().error.code).toBe("IDEMPOTENCY_KEY_REUSED");
    });

    it("a second active ride with a new key returns 409 ACTIVE_RIDE_EXISTS", async () => {
      const { token } = await riderToken();

      const first = await app.inject({
        method: "POST",
        url: "/api/v1/rides",
        headers: { ...bearer(token), "idempotency-key": randomUUID() },
        payload: rideBody(),
      });
      expect(first.statusCode).toBe(201);

      const second = await app.inject({
        method: "POST",
        url: "/api/v1/rides",
        headers: { ...bearer(token), "idempotency-key": randomUUID() },
        payload: rideBody(),
      });

      expect(second.statusCode).toBe(409);
      expect(second.json().error.code).toBe("ACTIVE_RIDE_EXISTS");
    });
  });

  describe("GET /rides/:id", () => {
    async function createRide(token: string) {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/rides",
        headers: { ...bearer(token), "idempotency-key": randomUUID() },
        payload: rideBody(),
      });
      return response.json();
    }

    it("lets the owning rider view their ride", async () => {
      const { token } = await riderToken();
      const ride = await createRide(token);

      const response = await app.inject({
        method: "GET",
        url: `/api/v1/rides/${ride.id}`,
        headers: bearer(token),
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().id).toBe(ride.id);
    });

    it("forbids a different rider from viewing the ride", async () => {
      const { token } = await riderToken();
      const ride = await createRide(token);
      const { token: otherToken } = await riderToken();

      const response = await app.inject({
        method: "GET",
        url: `/api/v1/rides/${ride.id}`,
        headers: bearer(otherToken),
      });

      expect(response.statusCode).toBe(403);
    });

    it("lets an admin view any ride", async () => {
      const { token } = await riderToken();
      const ride = await createRide(token);
      const admin = await seedUser(db, "admin");
      const adminToken = await loginAs(app, admin.email);

      const response = await app.inject({
        method: "GET",
        url: `/api/v1/rides/${ride.id}`,
        headers: bearer(adminToken),
      });

      expect(response.statusCode).toBe(200);
    });

    it("returns 404 for an unknown ride id", async () => {
      const { token } = await riderToken();

      const response = await app.inject({
        method: "GET",
        url: `/api/v1/rides/${randomUUID()}`,
        headers: bearer(token),
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("POST /rides/:id/cancel", () => {
    async function createRide(token: string) {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/rides",
        headers: { ...bearer(token), "idempotency-key": randomUUID() },
        payload: rideBody(),
      });
      return response.json();
    }

    it("lets the owning rider cancel a requested ride", async () => {
      const { token } = await riderToken();
      const ride = await createRide(token);

      const response = await app.inject({
        method: "POST",
        url: `/api/v1/rides/${ride.id}/cancel`,
        headers: bearer(token),
        payload: { reason: "changed my mind" },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe("cancelled");
    });

    it("forbids a different rider from cancelling", async () => {
      const { token } = await riderToken();
      const ride = await createRide(token);
      const { token: otherToken } = await riderToken();

      const response = await app.inject({
        method: "POST",
        url: `/api/v1/rides/${ride.id}/cancel`,
        headers: bearer(otherToken),
        payload: {},
      });

      expect(response.statusCode).toBe(403);
    });

    it("lets an admin cancel any ride", async () => {
      const { token } = await riderToken();
      const ride = await createRide(token);
      const admin = await seedUser(db, "admin");
      const adminToken = await loginAs(app, admin.email);

      const response = await app.inject({
        method: "POST",
        url: `/api/v1/rides/${ride.id}/cancel`,
        headers: bearer(adminToken),
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().cancelledBy).toBe(admin.id);
    });

    it("returns 409 INVALID_TRANSITION when cancelling an already-cancelled ride", async () => {
      const { token } = await riderToken();
      const ride = await createRide(token);

      await app.inject({
        method: "POST",
        url: `/api/v1/rides/${ride.id}/cancel`,
        headers: bearer(token),
        payload: {},
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/v1/rides/${ride.id}/cancel`,
        headers: bearer(token),
        payload: {},
      });

      expect(response.statusCode).toBe(409);
      expect(response.json().error.code).toBe("INVALID_TRANSITION");
    });
  });
});
