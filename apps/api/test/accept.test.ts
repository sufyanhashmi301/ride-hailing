import { randomUUID } from "node:crypto";
import { createDb, rideAssignments, rides } from "@ride/db";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestApp, stopTestApp, type TestApp } from "./helpers/app.js";
import { bearer, loginAs } from "./helpers/auth.js";
import { seedCity, seedDriver, seedPackages, seedUser } from "./helpers/fixtures.js";

const PICKUP = { lat: 31.5204, lng: 74.3587, label: "Liberty Market" };
const DROPOFF = { lat: 31.5304, lng: 74.3587, label: "Packages Mall" };

describe("POST /rides/:id/accept", () => {
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

  async function driverToken(overrides: Parameters<typeof seedDriver>[2] = {}) {
    const { user, driver } = await seedDriver(db, cityId, overrides);
    const token = await loginAs(app, user.email);
    return { user, driver, token };
  }

  it("exactly one of 20 concurrently-racing drivers wins the ride", async () => {
    const ride = await createRequestedRide();
    const drivers = await Promise.all(Array.from({ length: 20 }, () => driverToken()));

    const results = await Promise.all(
      drivers.map(({ token }) =>
        app.inject({
          method: "POST",
          url: `/api/v1/rides/${ride.id}/accept`,
          headers: bearer(token),
        }),
      ),
    );

    const succeeded = results.filter((r) => r.statusCode === 200);
    const conflicted = results.filter((r) => r.statusCode === 409);
    expect(succeeded).toHaveLength(1);
    expect(conflicted).toHaveLength(19);
    for (const response of conflicted) {
      expect(response.json().error.code).toBe("RIDE_ALREADY_ACCEPTED");
    }

    const assignments = await db
      .select()
      .from(rideAssignments)
      .where(eq(rideAssignments.rideId, ride.id));
    expect(assignments).toHaveLength(1);

    const [updatedRide] = await db.select().from(rides).where(eq(rides.id, ride.id));
    expect(updatedRide?.status).toBe("accepted");
  });

  it("a driver racing to accept two different rides wins exactly one", async () => {
    const rideA = await createRequestedRide();
    const rideB = await createRequestedRide();
    const { driver, token } = await driverToken();

    const [resultA, resultB] = await Promise.all([
      app.inject({
        method: "POST",
        url: `/api/v1/rides/${rideA.id}/accept`,
        headers: bearer(token),
      }),
      app.inject({
        method: "POST",
        url: `/api/v1/rides/${rideB.id}/accept`,
        headers: bearer(token),
      }),
    ]);

    const statusCodes = [resultA.statusCode, resultB.statusCode].sort();
    expect(statusCodes).toEqual([200, 409]);
    const busyResponse = resultA.statusCode === 409 ? resultA : resultB;
    expect(busyResponse.json().error.code).toBe("DRIVER_BUSY");

    const activeAssignments = await db
      .select()
      .from(rideAssignments)
      .where(eq(rideAssignments.driverId, driver.userId));
    expect(activeAssignments).toHaveLength(1);
  });

  it("returns 422 DRIVER_NOT_ELIGIBLE for an offline driver", async () => {
    const ride = await createRequestedRide();
    const { token } = await driverToken({ isOnline: false });

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/rides/${ride.id}/accept`,
      headers: bearer(token),
    });

    expect(response.statusCode).toBe(422);
    expect(response.json().error.code).toBe("DRIVER_NOT_ELIGIBLE");
  });

  it("returns 422 DRIVER_NOT_ELIGIBLE for a driver in the wrong vehicle category", async () => {
    const ride = await createRequestedRide("economy");
    const { token } = await driverToken({ vehicleCategory: "comfort" });

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/rides/${ride.id}/accept`,
      headers: bearer(token),
    });

    expect(response.statusCode).toBe(422);
  });

  it("returns 409 RIDE_ALREADY_ACCEPTED when accepting an already-accepted ride", async () => {
    const ride = await createRequestedRide();
    const { token: firstToken } = await driverToken();
    const { token: secondToken } = await driverToken();

    const first = await app.inject({
      method: "POST",
      url: `/api/v1/rides/${ride.id}/accept`,
      headers: bearer(firstToken),
    });
    expect(first.statusCode).toBe(200);

    const second = await app.inject({
      method: "POST",
      url: `/api/v1/rides/${ride.id}/accept`,
      headers: bearer(secondToken),
    });
    expect(second.statusCode).toBe(409);
    expect(second.json().error.code).toBe("RIDE_ALREADY_ACCEPTED");
  });

  it("returns 404 for an unknown ride", async () => {
    const { token } = await driverToken();

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/rides/${randomUUID()}/accept`,
      headers: bearer(token),
    });

    expect(response.statusCode).toBe(404);
  });

  it("forbids a rider from accepting a ride", async () => {
    const ride = await createRequestedRide();
    const rider = await seedUser(db, "rider");
    const token = await loginAs(app, rider.email);

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/rides/${ride.id}/accept`,
      headers: bearer(token),
    });

    expect(response.statusCode).toBe(403);
  });
});
