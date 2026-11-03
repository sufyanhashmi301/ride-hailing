import type { FastifyInstance } from "fastify";
import { TEST_PASSWORD } from "./fixtures.js";

export async function loginAs(
  app: FastifyInstance,
  email: string,
  password: string = TEST_PASSWORD,
): Promise<string> {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: { email, password },
  });
  if (response.statusCode !== 200) {
    throw new Error(`login failed for ${email}: ${response.statusCode} ${response.body}`);
  }
  const body = response.json() as { token: string };
  return body.token;
}

export function bearer(token: string): { authorization: string } {
  return { authorization: `Bearer ${token}` };
}
