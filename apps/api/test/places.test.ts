import { createDb, places } from "@ride/db";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestApp, stopTestApp, type TestApp } from "./helpers/app.js";
import { bearer, loginAs } from "./helpers/auth.js";
import { seedCity, seedUser } from "./helpers/fixtures.js";

describe("places routes", () => {
  let testApp: TestApp;
  let app: FastifyInstance;
  let db: ReturnType<typeof createDb>;

  beforeAll(async () => {
    testApp = await startTestApp();
    app = testApp.app;
    db = createDb(testApp.databaseUrl);

    const city = await seedCity(db);
    await db.insert(places).values([
      { cityId: city.id, name: "Liberty Market", lat: 31.5125, lng: 74.3458 },
      { cityId: city.id, name: "Packages Mall", lat: 31.4789, lng: 74.363 },
    ]);
  }, 60_000);

  afterAll(async () => {
    await db.$client.end();
    await stopTestApp(testApp);
  });

  it("requires authentication", async () => {
    const response = await app.inject({ method: "GET", url: "/api/v1/places" });
    expect(response.statusCode).toBe(401);
  });

  it("returns all places without a query", async () => {
    const rider = await seedUser(db, "rider");
    const token = await loginAs(app, rider.email);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/places",
      headers: bearer(token),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().places.length).toBeGreaterThanOrEqual(2);
  });

  it("filters by name, case-insensitively", async () => {
    const rider = await seedUser(db, "rider");
    const token = await loginAs(app, rider.email);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/places?q=liberty",
      headers: bearer(token),
    });

    expect(response.statusCode).toBe(200);
    const results = response.json().places;
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Liberty Market");
  });
});
