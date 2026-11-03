import {
  LoginRequestSchema,
  LoginResponseSchema,
  MeResponseSchema,
  OkResponseSchema,
} from "@ride/contracts";
import type { Db } from "@ride/db";
import type { Env } from "../../config/env.js";
import { notFound, unauthenticated } from "../../lib/api-error.js";
import { rateLimitConfig } from "../../lib/rate-limit.js";
import {
  clearSessionCookie,
  currentUser,
  requireAuth,
  setSessionCookie,
  signAccessToken,
} from "../../plugins/auth.js";
import type { App } from "../../types.js";
import { getUserById, InvalidCredentialsError, login } from "./auth.service.js";

export function registerAuthRoutes(app: App, db: Db, env: Env) {
  app.post("/api/v1/auth/login", {
    config: { rateLimit: rateLimitConfig(env, 5, "1 minute") },
    schema: {
      body: LoginRequestSchema,
      response: { 200: LoginResponseSchema },
    },
    handler: async (request, reply) => {
      const { email, password } = request.body;

      try {
        const user = await login(db, email, password);
        const token = await signAccessToken(
          { sub: user.id, role: user.role, email: user.email },
          env,
        );
        setSessionCookie(reply, token, env);
        return { user, token };
      } catch (error) {
        if (error instanceof InvalidCredentialsError) {
          throw unauthenticated(error.message);
        }
        throw error;
      }
    },
  });

  app.post("/api/v1/auth/logout", {
    preHandler: requireAuth,
    schema: {
      response: { 200: OkResponseSchema },
    },
    handler: async (_request, reply) => {
      clearSessionCookie(reply, env);
      return { ok: true as const };
    },
  });

  app.get("/api/v1/auth/me", {
    preHandler: requireAuth,
    schema: {
      response: { 200: MeResponseSchema },
    },
    handler: async (request) => {
      const user = await getUserById(db, currentUser(request).sub);
      if (!user) throw notFound("User not found");
      return { user };
    },
  });
}
