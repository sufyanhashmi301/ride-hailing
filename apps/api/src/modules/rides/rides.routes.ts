import {
  CancelRideRequestSchema,
  CreateRideRequestSchema,
  EstimateRequestSchema,
  EstimateResponseSchema,
  RideSchema,
} from "@ride/contracts";
import type { Db } from "@ride/db";
import { z } from "zod";
import type { Env } from "../../config/env.js";
import { rateLimitConfig } from "../../lib/rate-limit.js";
import { currentUser, requireAuth } from "../../plugins/auth.js";
import { requireRole } from "../../plugins/rbac.js";
import type { App } from "../../types.js";
import {
  acceptRide,
  cancelRide,
  completeRide,
  createRide,
  estimateRide,
  getRide,
  toRideDto,
} from "./rides.service.js";

const RideParamsSchema = z.object({ id: z.uuid() });
const IdempotencyHeaderSchema = z.object({
  "idempotency-key": z.string().min(1).max(200),
});

export function registerRidesRoutes(app: App, db: Db, env: Env) {
  app.post("/api/v1/rides/estimate", {
    preHandler: requireRole("rider"),
    config: { rateLimit: rateLimitConfig(env, 30, "1 minute") },
    schema: {
      body: EstimateRequestSchema,
      response: { 200: EstimateResponseSchema },
    },
    handler: async (request) => {
      return estimateRide(db, request.body);
    },
  });

  app.post("/api/v1/rides", {
    preHandler: requireRole("rider"),
    config: { rateLimit: rateLimitConfig(env, 20, "1 minute") },
    schema: {
      headers: IdempotencyHeaderSchema,
      body: CreateRideRequestSchema,
      response: { 200: RideSchema, 201: RideSchema },
    },
    handler: async (request, reply) => {
      const user = currentUser(request);
      const rider = { id: user.sub, role: user.role };
      const idempotencyKey = request.headers["idempotency-key"];
      const { detail, created } = await createRide(db, rider, idempotencyKey, request.body);
      reply.code(created ? 201 : 200);
      return toRideDto(detail);
    },
  });

  app.get("/api/v1/rides/:id", {
    preHandler: requireAuth,
    schema: {
      params: RideParamsSchema,
      response: { 200: RideSchema },
    },
    handler: async (request) => {
      const user = currentUser(request);
      const requester = { id: user.sub, role: user.role };
      const detail = await getRide(db, request.params.id, requester);
      return toRideDto(detail);
    },
  });

  app.post("/api/v1/rides/:id/cancel", {
    preHandler: requireRole("rider", "admin"),
    config: { rateLimit: rateLimitConfig(env, 20, "1 minute") },
    schema: {
      params: RideParamsSchema,
      body: CancelRideRequestSchema,
      response: { 200: RideSchema },
    },
    handler: async (request) => {
      const user = currentUser(request);
      const actor = { id: user.sub, role: user.role };
      const detail = await cancelRide(db, request.params.id, actor, request.body.reason);
      return toRideDto(detail);
    },
  });

  app.post("/api/v1/rides/:id/accept", {
    preHandler: requireRole("driver"),
    config: { rateLimit: rateLimitConfig(env, 30, "1 minute") },
    schema: {
      params: RideParamsSchema,
      response: { 200: RideSchema },
    },
    handler: async (request) => {
      const detail = await acceptRide(db, request.params.id, currentUser(request).sub);
      return toRideDto(detail);
    },
  });

  app.post("/api/v1/rides/:id/complete", {
    preHandler: requireRole("driver"),
    config: { rateLimit: rateLimitConfig(env, 30, "1 minute") },
    schema: {
      params: RideParamsSchema,
      response: { 200: RideSchema },
    },
    handler: async (request) => {
      const detail = await completeRide(db, request.params.id, currentUser(request).sub);
      return toRideDto(detail);
    },
  });
}
