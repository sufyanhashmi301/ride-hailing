---
paths:
  - "apps/api/**/*.ts"
  - "packages/contracts/**/*.ts"
---

# API rules

- Every request and response has a Zod schema in `packages/contracts`. No untyped `any` payload.
- All routes live under `/api/v1`. Resources are plural nouns; actions are
  `POST /{resource}/{id}/{action}` (e.g. `POST /rides/{id}/accept`).
- A route handler calls exactly one service method and returns its result. No SQL, no Drizzle
  import, in a `*.routes.ts` file.
- Ownership checks (does this rider own this ride, is this driver the assigned one) happen inside
  the service, not the route — the route only checks role.
- Every error response uses the envelope
  `{ "error": { "code", "message", "details", "requestId" } }` with a stable `code`, never a raw
  stack trace.
- Status code mapping: `400` validation/outside-service-area, `401/403` auth, `404` not found,
  `409` state conflicts (`INVALID_TRANSITION`, `RIDE_ALREADY_ACCEPTED`, `ACTIVE_RIDE_EXISTS`,
  `DRIVER_BUSY`, `IDEMPOTENCY_KEY_REUSED`), `422` `DRIVER_NOT_ELIGIBLE`, `429` rate limited.
- Every mutating ride endpoint (`accept`, `cancel`, `complete`, `POST /rides`) must be safe to
  retry: repeating the same call returns the current state or a 409, never a double effect.
- Log with request context (`requestId`, `userId`, `rideId`, `driverId` where relevant); never log
  passwords, tokens or full request bodies that might carry secrets.
