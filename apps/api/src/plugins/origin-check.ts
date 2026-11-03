import type { FastifyInstance } from "fastify";
import type { Env } from "../config/env.js";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * CSRF defence for the cookie-based web session: a mutating request carrying an Origin header
 * must match WEB_ORIGIN. Bearer-token clients (mobile/desktop, curl) don't rely on cookies and
 * typically omit Origin, so their requests pass through unchecked.
 */
export function registerOriginCheck(app: FastifyInstance, env: Env) {
  app.addHook("onRequest", async (request, reply) => {
    if (!MUTATING_METHODS.has(request.method)) return;

    const origin = request.headers.origin;
    if (!origin || origin === env.WEB_ORIGIN) return;

    return reply.code(403).send({
      error: {
        code: "FORBIDDEN",
        message: "Request origin is not allowed",
        details: {},
        requestId: request.id,
      },
    });
  });
}
