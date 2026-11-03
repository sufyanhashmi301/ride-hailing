import {
  AdminCitiesResponseSchema,
  AdminDriversResponseSchema,
  AdminRideListQuerySchema,
  AdminRideListResponseSchema,
  CreateDriverRequestSchema,
  CreateDriverResponseSchema,
  UpdateDriverStatusRequestSchema,
  UpdateDriverStatusResponseSchema,
  UpdatePackageRequestSchema,
  UpdatePackageResponseSchema,
} from "@ride/contracts";
import type { Db } from "@ride/db";
import { z } from "zod";
import type { Env } from "../../config/env.js";
import { rateLimitConfig } from "../../lib/rate-limit.js";
import { requireRole } from "../../plugins/rbac.js";
import type { App } from "../../types.js";
import {
  createDriver,
  listActiveCities,
  listDrivers,
  listRides,
  setDriverActive,
  updatePackage,
} from "./admin.service.js";

const DriverParamsSchema = z.object({ id: z.uuid() });
const PackageParamsSchema = z.object({ id: z.uuid() });

export function registerAdminRoutes(app: App, db: Db, env: Env) {
  app.post("/api/v1/admin/drivers", {
    preHandler: requireRole("admin"),
    config: { rateLimit: rateLimitConfig(env, 20, "1 minute") },
    schema: {
      body: CreateDriverRequestSchema,
      response: { 201: CreateDriverResponseSchema },
    },
    handler: async (request, reply) => {
      const result = await createDriver(db, request.body);
      reply.code(201);
      return result;
    },
  });

  app.get("/api/v1/admin/drivers", {
    preHandler: requireRole("admin"),
    schema: {
      response: { 200: AdminDriversResponseSchema },
    },
    handler: async () => {
      const drivers = await listDrivers(db);
      return { drivers };
    },
  });

  app.get("/api/v1/admin/cities", {
    preHandler: requireRole("admin"),
    schema: {
      response: { 200: AdminCitiesResponseSchema },
    },
    handler: async () => {
      const activeCities = await listActiveCities(db);
      return { cities: activeCities };
    },
  });

  app.patch("/api/v1/admin/drivers/:id", {
    preHandler: requireRole("admin"),
    config: { rateLimit: rateLimitConfig(env, 30, "1 minute") },
    schema: {
      params: DriverParamsSchema,
      body: UpdateDriverStatusRequestSchema,
      response: { 200: UpdateDriverStatusResponseSchema },
    },
    handler: async (request) => {
      const driver = await setDriverActive(db, request.params.id, request.body.isActive);
      return { driver };
    },
  });

  app.patch("/api/v1/admin/packages/:id", {
    preHandler: requireRole("admin"),
    config: { rateLimit: rateLimitConfig(env, 30, "1 minute") },
    schema: {
      params: PackageParamsSchema,
      body: UpdatePackageRequestSchema,
      response: { 200: UpdatePackageResponseSchema },
    },
    handler: async (request) => {
      const pkg = await updatePackage(db, request.params.id, request.body);
      return { package: pkg };
    },
  });

  app.get("/api/v1/admin/rides", {
    preHandler: requireRole("admin"),
    schema: {
      querystring: AdminRideListQuerySchema,
      response: { 200: AdminRideListResponseSchema },
    },
    handler: async (request) => {
      return listRides(db, request.query);
    },
  });
}
