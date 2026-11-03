import type { Env } from "../config/env.js";

/**
 * Per-route rate limit config. Disabled under NODE_ENV=test: integration tests create many
 * accounts and log in frequently within a minute, and app.inject() requests all share one
 * loopback IP, so a real limit here would throttle the test suite rather than a client.
 */
export function rateLimitConfig(
  env: Env,
  max: number,
  timeWindow: string,
): { max: number; timeWindow: string } | false {
  if (env.NODE_ENV === "test") return false;
  return { max, timeWindow };
}
