import { migrateDatabase } from "@ride/db";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";
import { startTestPostgres, stopTestPostgres } from "./postgres.js";

export interface TestApp {
  app: FastifyInstance;
  databaseUrl: string;
}

export async function startTestApp(): Promise<TestApp> {
  const databaseUrl = await startTestPostgres();
  await migrateDatabase(databaseUrl);

  const app = await buildApp({
    NODE_ENV: "test",
    PORT: 0,
    DATABASE_URL: databaseUrl,
    JWT_SECRET: "test-secret-at-least-32-characters-long",
    WEB_ORIGIN: "http://localhost:3000",
    LOG_LEVEL: "error",
  });

  return { app, databaseUrl };
}

export async function stopTestApp(testApp: TestApp): Promise<void> {
  await testApp.app.close();
  await stopTestPostgres();
}
