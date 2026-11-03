import fastifyCookie from "@fastify/cookie";
import fastifyHelmet from "@fastify/helmet";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifySensible from "@fastify/sensible";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "@fastify/type-provider-zod";
import { createDb } from "@ride/db";
import { sql } from "drizzle-orm";
import Fastify from "fastify";
import { z } from "zod";
import type { Env } from "./config/env.js";
import { registerAdminRoutes } from "./modules/admin/admin.routes.js";
import { registerAuthRoutes } from "./modules/auth/auth.routes.js";
import { registerDriversRoutes } from "./modules/drivers/drivers.routes.js";
import { registerPlacesRoutes } from "./modules/places/places.routes.js";
import { registerRidesRoutes } from "./modules/rides/rides.routes.js";
import { registerAuth } from "./plugins/auth.js";
import { registerErrorHandler } from "./plugins/errors.js";
import { registerOriginCheck } from "./plugins/origin-check.js";
import { generateRequestId, registerRequestId } from "./plugins/request-id.js";
import { registerSwagger } from "./plugins/swagger.js";

export async function buildApp(env: Env) {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.cookie",
          'res.headers["set-cookie"]',
          "*.password",
          "*.passwordHash",
          "*.token",
          "*.temporaryPassword",
        ],
        censor: "[redacted]",
      },
      ...(env.NODE_ENV === "development" ? { transport: { target: "pino-pretty" } } : {}),
    },
    genReqId: generateRequestId,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  registerRequestId(app);
  registerErrorHandler(app);
  await registerSwagger(app);

  await app.register(fastifyHelmet, { contentSecurityPolicy: false });
  await app.register(fastifyCookie);
  await app.register(fastifySensible);

  // Decorates request.user from the session cookie or a Bearer token (onRequest phase, so it
  // always runs before any preHandler, including the rate limiter below).
  registerAuth(app, env);
  registerOriginCheck(app, env);

  await app.register(fastifyRateLimit, {
    global: true,
    hook: "preHandler",
    max: 300,
    timeWindow: "1 minute",
    keyGenerator: (request) => request.user?.sub ?? request.ip,
  });

  const db = createDb(env.DATABASE_URL);
  app.addHook("onClose", async () => {
    await db.$client.end();
  });

  registerAuthRoutes(app, db, env);
  registerPlacesRoutes(app, db);
  registerRidesRoutes(app, db, env);
  registerDriversRoutes(app, db, env);
  registerAdminRoutes(app, db, env);

  app.get("/api/v1/health/live", {
    schema: {
      response: { 200: z.object({ status: z.literal("ok") }) },
    },
    handler: async () => ({ status: "ok" as const }),
  });

  app.get("/api/v1/health/ready", {
    schema: {
      response: {
        200: z.object({ status: z.literal("ok") }),
        503: z.object({ status: z.literal("error"), message: z.string() }),
      },
    },
    handler: async (_request, reply) => {
      try {
        await db.execute(sql`select 1`);
        return { status: "ok" as const };
      } catch (error) {
        return reply.status(503).send({
          status: "error" as const,
          message: error instanceof Error ? error.message : "database unreachable",
        });
      }
    },
  });

  return app;
}
