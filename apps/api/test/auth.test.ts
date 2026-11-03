import { createDb } from "@ride/db";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestApp, stopTestApp, type TestApp } from "./helpers/app.js";
import { bearer, loginAs } from "./helpers/auth.js";
import { seedUser, TEST_PASSWORD } from "./helpers/fixtures.js";

describe("auth routes", () => {
  let testApp: TestApp;
  let app: FastifyInstance;
  let db: ReturnType<typeof createDb>;

  beforeAll(async () => {
    testApp = await startTestApp();
    app = testApp.app;
    db = createDb(testApp.databaseUrl);
  }, 60_000);

  afterAll(async () => {
    await db.$client.end();
    await stopTestApp(testApp);
  });

  it("logs in a seeded user and returns a token plus a session cookie", async () => {
    const rider = await seedUser(db, "rider");

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: rider.email, password: TEST_PASSWORD },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.user).toMatchObject({ id: rider.id, email: rider.email, role: "rider" });
    expect(typeof body.token).toBe("string");
    expect(response.cookies.some((cookie) => cookie.name === "session")).toBe(true);
  });

  it("returns 401 for the wrong password", async () => {
    const rider = await seedUser(db, "rider");
    const wrongPassword = [TEST_PASSWORD, "wrong"].join("-");

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: rider.email, password: wrongPassword },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe("UNAUTHENTICATED");
  });

  it("returns 401 for an unknown email", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "nobody@test.local", password: TEST_PASSWORD },
    });

    expect(response.statusCode).toBe(401);
  });

  it("returns 401 for a disabled account", async () => {
    const rider = await seedUser(db, "rider", { isActive: false });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: rider.email, password: TEST_PASSWORD },
    });

    expect(response.statusCode).toBe(401);
  });

  it("rejects malformed login bodies with a validation error", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "not-an-email", password: "" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("GET /auth/me requires authentication", async () => {
    const response = await app.inject({ method: "GET", url: "/api/v1/auth/me" });
    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe("UNAUTHENTICATED");
  });

  it("GET /auth/me returns the current user for a valid token", async () => {
    const rider = await seedUser(db, "rider");
    const token = await loginAs(app, rider.email);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: bearer(token),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().user).toMatchObject({ id: rider.id, email: rider.email });
  });

  it("logs out and clears the session cookie", async () => {
    const rider = await seedUser(db, "rider");
    const token = await loginAs(app, rider.email);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      headers: bearer(token),
    });

    expect(response.statusCode).toBe(200);
    const sessionCookie = response.cookies.find((cookie) => cookie.name === "session");
    expect(sessionCookie?.value).toBe("");
  });
});
