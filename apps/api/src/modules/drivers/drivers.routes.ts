import {
  AvailableRidesResponseSchema,
  CurrentRideResponseSchema,
  DriverMeResponseSchema,
  RideListQuerySchema,
  RideListResponseSchema,
  UpdateDriverMeRequestSchema,
} from "@ride/contracts";
import type { Db } from "@ride/db";
import type { Env } from "../../config/env.js";
import { rateLimitConfig } from "../../lib/rate-limit.js";
import { currentUser } from "../../plugins/auth.js";
import { requireRole } from "../../plugins/rbac.js";
import type { App } from "../../types.js";
import {
  getCurrentRide,
  getDriverMe,
  listAvailableRides,
  listRidesForDriver,
  updateDriverMe,
} from "./drivers.service.js";

export function registerDriversRoutes(app: App, db: Db, env: Env) {
  app.patch("/api/v1/driver/me", {
    preHandler: requireRole("driver"),
    config: { rateLimit: rateLimitConfig(env, 60, "1 minute") },
    schema: {
      body: UpdateDriverMeRequestSchema,
      response: { 200: DriverMeResponseSchema },
    },
    handler: async (request) => {
      const driver = await updateDriverMe(db, currentUser(request).sub, request.body);
      return { driver };
    },
  });

  app.get("/api/v1/driver/me", {
    preHandler: requireRole("driver"),
    schema: {
      response: { 200: DriverMeResponseSchema },
    },
    handler: async (request) => {
      const driver = await getDriverMe(db, currentUser(request).sub);
      return { driver };
    },
  });

  app.get("/api/v1/driver/rides/available", {
    preHandler: requireRole("driver"),
    schema: {
      response: { 200: AvailableRidesResponseSchema },
    },
    handler: async (request) => {
      const rides = await listAvailableRides(db, currentUser(request).sub);
      return { rides };
    },
  });

  app.get("/api/v1/driver/rides/current", {
    preHandler: requireRole("driver"),
    schema: {
      response: { 200: CurrentRideResponseSchema },
    },
    handler: async (request) => {
      const ride = await getCurrentRide(db, currentUser(request).sub);
      return { ride };
    },
  });

  app.get("/api/v1/driver/rides", {
    preHandler: requireRole("driver"),
    schema: {
      querystring: RideListQuerySchema,
      response: { 200: RideListResponseSchema },
    },
    handler: async (request) => {
      const driverId = currentUser(request).sub;
      return listRidesForDriver(db, driverId, request.query);
    },
  });
}
