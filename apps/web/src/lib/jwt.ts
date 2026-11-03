export interface SessionTokenPayload {
  sub?: string;
  role?: "rider" | "driver" | "admin";
  email?: string;
}

/**
 * Reads the JWT payload without verifying the signature. This is only ever used for UX
 * redirects (middleware, initial route choice) -- the API verifies the token and re-checks
 * role/ownership on every request regardless of what this returns.
 */
export function decodeSessionToken(token: string): SessionTokenPayload | null {
  const parts = token.split(".");
  const payloadSegment = parts[1];
  if (parts.length !== 3 || !payloadSegment) return null;

  try {
    const json = Buffer.from(payloadSegment, "base64url").toString("utf-8");
    return JSON.parse(json) as SessionTokenPayload;
  } catch {
    return null;
  }
}
