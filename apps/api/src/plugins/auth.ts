import type { UserRole } from "@ride/contracts";
import type { FastifyReply, FastifyRequest } from "fastify";
import { type JWTPayload, jwtVerify, SignJWT } from "jose";
import type { Env } from "../config/env.js";
import type { App } from "../types.js";

export interface AuthTokenPayload extends JWTPayload {
  sub: string;
  role: UserRole;
  email: string;
}

const ACCESS_TOKEN_TTL = "15m";
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const SESSION_COOKIE_NAME = "session";

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthTokenPayload;
  }
}

function secretKey(env: Env): Uint8Array {
  return new TextEncoder().encode(env.JWT_SECRET);
}

export async function signAccessToken(payload: AuthTokenPayload, env: Env): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(secretKey(env));
}

export async function verifyAccessToken(token: string, env: Env): Promise<AuthTokenPayload> {
  const { payload } = await jwtVerify(token, secretKey(env));
  return {
    sub: String(payload.sub),
    role: payload.role as UserRole,
    email: String(payload.email),
  };
}

function extractToken(request: FastifyRequest): string | undefined {
  const cookieToken = request.cookies[SESSION_COOKIE_NAME];
  if (cookieToken) return cookieToken;

  const header = request.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice("Bearer ".length);

  return undefined;
}

export function registerAuth(app: App, env: Env) {
  app.addHook("onRequest", async (request) => {
    const token = extractToken(request);
    if (!token) return;

    try {
      request.user = await verifyAccessToken(token, env);
    } catch {
      // invalid or expired token: leave the request unauthenticated, route guards decide
    }
  });
}

/** Reads the user set by the `onRequest` hook above. Call only after a `requireAuth`/`requireRole` preHandler has run. */
export function currentUser(request: FastifyRequest): AuthTokenPayload {
  if (!request.user) {
    throw new Error("currentUser() called before requireAuth/requireRole verified the request");
  }
  return request.user;
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    reply.code(401).send({
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication required",
        details: {},
        requestId: request.id,
      },
    });
  }
}

export function setSessionCookie(reply: FastifyReply, token: string, env: Env) {
  reply.setCookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TOKEN_TTL_SECONDS,
  });
}

export function clearSessionCookie(reply: FastifyReply, env: Env) {
  reply.clearCookie(SESSION_COOKIE_NAME, {
    path: "/",
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    httpOnly: true,
  });
}
