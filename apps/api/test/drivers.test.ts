import { randomUUID } from "node:crypto";
import { createDb } from "@ride/db";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestApp, stopTestApp, type TestApp } from "./helpers/app.js";
import { bearer, loginAs } from "./helpers/auth.js";
import { seedCity, seedDriver, seedPackages, seedUser } from "./helpers/fixtures.js";

const PICKUP = { lat: 31.5204, lng: 74.3587, label: "Liberty Market" };
const DROPOFF = { lat: 31.5304, lng: 74.3587, label: "Packages Mall" };

describe("driver routes", () => {
  let testApp: TestApp;
  let app: FastifyInstance;
  let db: ReturnType<typeof createDb>;
  let cityId: string;

  beforeAll(async () => {
    testApp = await startTestApp();
    app = testApp.app;
    db = createDb(testApp.databaseUrl);

    const city = await seedCity(db);
    cityId = city.id;
    await seedPackages(db, cityId);
  }, 60_000);

  afterAll(async () => {
    await db.$client.end();
    await stopTestApp(testApp);
  });

  async function createRequestedRide(category: "economy" | "comfort" = "economy") {
    const rider = await seedUser(db, "rider");
    const token = await loginAs(app, rider.email);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/rides",
      headers: { ...bearer(token), "idempotency-key": randomUUID() },
      payload: { category, pickup: PICKUP, dropoff: DROPOFF },
    });
    expect(response.statusCode).toBe(201);
    return response.json();
  }

  describe("PATCH /driver/me", () => {
    it("toggles online status and records location", async () => {
      const { user } = await seedDriver(db, cityId, { isOnline: false });
      const token = await loginAs(app, user.email);

      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/driver/me",
        headers: bearer(token),
        payload: { isOnline: true, lastLat: PICKUP.lat, lastLng: PICKUP.lng },
      });

      expect(response.statusCode).toBe(200);
      const driver = response.json().driver;
      expect(driver.isOnline).toBe(true);
      expect(driver.lastLat).toBeCloseTo(PICKUP.lat, 5);
      expect(driver.lastLng).toBeCloseTo(PICKUP.lng, 5);
    });

    it("rejects non-drivers", async () => {
      const rider = await seedUser(db, "rider");
      const token = await loginAs(app, rider.email);

      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/driver/me",
        headers: bearer(token),
        payload: { isOnline: true },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("GET /driver/rides/available", () => {
    it("only lists rides matching the driver's city and category", async () => {
      const economyRide = await createRequestedRide("economy");
      const comfortRide = await createRequestedRide("comfort");
      const { user } = await seedDriver(db, cityId, { vehicleCategory: "economy", isOnline: true });
      const token = await loginAs(app, user.email);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/driver/rides/available",
        headers: bearer(token),
      });

      expect(response.statusCode).toBe(200);
      const ids = response.json().rides.map((r: { id: string }) => r.id);
      expect(ids).toContain(economyRide.id);
      expect(ids).not.toContain(comfortRide.id);
    });

    it("returns nothing for an offline driver", async () => {
      await createRequestedRide("economy");
      const { user } = await seedDriver(db, cityId, {
        vehicleCategory: "economy",
        isOnline: false,
      });
      const token = await loginAs(app, user.email);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/driver/rides/available",
        headers: bearer(token),
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().rides).toEqual([]);
    });
  });

  describe("GET /driver/rides/current", () => {
    it("is null before accepting and reflects the ride after accepting", async () => {
      const ride = await createRequestedRide("economy");
      const { user } = await seedDriver(db, cityId, { vehicleCategory: "economy", isOnline: true });
      const token = await loginAs(app, user.email);

      const before = await app.inject({
        method: "GET",
        url: "/api/v1/driver/rides/current",
        headers: bearer(token),
      });
      expect(before.json().ride).toBeNull();

      const accept = await app.inject({
        method: "POST",
        url: `/api/v1/rides/${ride.id}/accept`,
        headers: bearer(token),
      });
      expect(accept.statusCode).toBe(200);

      const after = await app.inject({
        method: "GET",
        url: "/api/v1/driver/rides/current",
        headers: bearer(token),
      });
      expect(after.json().ride.id).toBe(ride.id);
      expect(after.json().ride.status).toBe("accepted");
    });
  });

  describe("POST /rides/:id/complete", () => {
    it("lets the assigned driver complete an accepted ride", async () => {
      const ride = await createRequestedRide("economy");
      const { user } = await seedDriver(db, cityId, { vehicleCategory: "economy", isOnline: true });
      const token = await loginAs(app, user.email);

      await app.inject({
        method: "POST",
        url: `/api/v1/rides/${ride.id}/accept`,
        headers: bearer(token),
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/v1/rides/${ride.id}/complete`,
        headers: bearer(token),
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe("completed");

      const current = await app.inject({
        method: "GET",
        url: "/api/v1/driver/rides/current",
        headers: bearer(token),
      });
      expect(current.json().ride).toBeNull();
    });

    it("forbids a driver who was never assigned from completing the ride", async () => {
      const ride = await createRequestedRide("economy");
      const { user: assignedDriver } = await seedDriver(db, cityId, {
        vehicleCategory: "economy",
        isOnline: true,
      });
      const assignedToken = await loginAs(app, assignedDriver.email);
      await app.inject({
        method: "POST",
        url: `/api/v1/rides/${ride.id}/accept`,
        headers: bearer(assignedToken),
      });

      const { user: otherDriver } = await seedDriver(db, cityId, {
        vehicleCategory: "economy",
        isOnline: true,
      });
      const otherToken = await loginAs(app, otherDriver.email);

      const response = await app.inject({
        method: "POST",
        url: `/api/v1/rides/${ride.id}/complete`,
        headers: bearer(otherToken),
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
