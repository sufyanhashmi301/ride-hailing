import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "@fastify/type-provider-zod";
import Fastify from "fastify";
import { Pool } from "pg";
import { z } from "zod";
import type { Env } from "./config/env.js";
import { registerErrorHandler } from "./plugins/errors.js";
import { generateRequestId, registerRequestId } from "./plugins/request-id.js";
import { registerSwagger } from "./plugins/swagger.js";

export async function buildApp(env: Env) {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      ...(env.NODE_ENV === "development" ? { transport: { target: "pino-pretty" } } : {}),
    },
    genReqId: generateRequestId,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  registerRequestId(app);
  registerErrorHandler(app);
  await registerSwagger(app);

  const pool = new Pool({ connectionString: env.DATABASE_URL });
  app.addHook("onClose", async () => {
    await pool.end();
  });

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
        await pool.query("SELECT 1");
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
