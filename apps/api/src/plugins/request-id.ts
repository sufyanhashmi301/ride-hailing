import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { FastifyInstance } from "fastify";

/** Used as Fastify's `genReqId` so the id is set before the request logger is created. */
export function generateRequestId(raw: IncomingMessage): string {
  const incoming = raw.headers["x-request-id"];
  return typeof incoming === "string" && incoming.length > 0 ? incoming : randomUUID();
}

export function registerRequestId(app: FastifyInstance) {
  app.addHook("onRequest", async (request, reply) => {
    reply.header("x-request-id", request.id);
  });
}
