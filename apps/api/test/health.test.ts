import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { startTestPostgres, stopTestPostgres } from "./helpers/postgres.js";

describe("health routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const databaseUrl = await startTestPostgres();
    app = await buildApp({
      NODE_ENV: "test",
      PORT: 0,
      DATABASE_URL: databaseUrl,
      JWT_SECRET: "test-secret-at-least-32-characters-long",
      WEB_ORIGIN: "http://localhost:3000",
      LOG_LEVEL: "error",
    });
  }, 60_000);

  afterAll(async () => {
    await app.close();
    await stopTestPostgres();
  });

  it("GET /api/v1/health/live returns 200 ok", async () => {
    const response = await app.inject({ method: "GET", url: "/api/v1/health/live" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });

  it("GET /api/v1/health/ready returns 200 ok when the database is reachable", async () => {
    const response = await app.inject({ method: "GET", url: "/api/v1/health/ready" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });
});
