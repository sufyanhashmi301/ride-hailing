import { cookies } from "next/headers";
import { decodeSessionToken, type SessionTokenPayload } from "./jwt";

/**
 * Server-side, unverified read of the session cookie's role/sub -- cheap enough to use in a
 * layout as a UX redirect guard. The API still verifies the token and re-checks role/ownership
 * on every request; this never gates an action, only what the server renders.
 */
export async function getSessionPayload(): Promise<SessionTokenPayload | null> {
  const store = await cookies();
  const token = store.get("session")?.value;
  if (!token) return null;
  return decodeSessionToken(token);
}
