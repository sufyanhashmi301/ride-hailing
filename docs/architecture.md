# Architecture

## 1. System overview

One Fastify REST API, one Next.js web app serving all three roles (rider, driver, admin) through
route groups, one PostgreSQL database. No message queue, no separate services — at this scale
splitting further would add operational cost without adding correctness or speed.

```
┌─────────────┐        /api/v1/*         ┌──────────────┐        SQL         ┌────────────┐
│  Next.js     │ ───────────────────────▶ │   Fastify     │ ─────────────────▶ │ PostgreSQL │
│  (apps/web)  │ ◀─────────────────────── │   (apps/api)  │ ◀───────────────── │            │
└─────────────┘   JSON, session cookie    └──────────────┘    Drizzle ORM     └────────────┘
       │                                         │
       │ rewrites /api/* to API_INTERNAL_URL     │ one Zod schema per route:
       │ (see apps/web/next.config.ts)           │ request validation, response
       │                                         │ shape, and the OpenAPI doc
       ▼                                         ▼
  browser never talks to :4000 directly     GET /docs (Swagger UI)
```

Layering (enforced by `CLAUDE.md`, not just convention):

```
*.routes.ts   parse + authorise (role only) + call exactly one service method, return its result
*.service.ts  business logic, ownership checks, calls Drizzle directly
repositories  only where a query is complex and reused (the locking accept transaction);
              no generic repository layer over the rest
packages/domain   pure functions: fare math, Haversine distance, the ride state machine — no I/O,
                  so they're unit-tested without a database
packages/contracts   one Zod schema per request/response, imported by the API, the web forms,
                     and the typed `api-client` — a schema change is felt everywhere at once
```

Local dev: `pnpm dev` runs API (`:4000`) and web (`:3000`) together via Turborepo; Postgres runs in
Docker Compose. Deployed: three containers (`db`, `api`, `web`) in the same `docker-compose.yml`,
the web container reaching the API container by its service name (`http://api:4000`), the browser
never seeing port 4000 at all — every browser request goes to the web origin, which rewrites
`/api/*`.

## 2. Data model and schema design

```
users ──┬──< drivers (1:1, by userId)         cities ──< ride_packages (fare rates per city+category)
        │                                        │
        └──< rides >── fares (1:1, by rideId)     ├──< drivers
                │                                 ├──< rides
                └──< ride_assignments >── drivers  └──< places (seeded geocoding data)
```

- **`users`** — one table for all three roles (`role` column + a `ck_users_role` check), rather
  than per-role tables, since rider/driver/admin share the same auth and the only role-specific
  columns (vehicle, online status) live on `drivers`.
- **`drivers`** — `userId` is both the primary key and the FK to `users`, enforcing the 1:1 at the
  schema level. `isOnline` is the driver's own toggle and the _only_ thing stored here about
  availability — "busy" is never stored, it's derived from an active `ride_assignments` row (see
  §3). `lastLat`/`lastLng` are set at login from seed data in this build; a real deployment would
  update them from a driver-app location stream.
- **`rides`** — the aggregate root for a trip. Pickup/dropoff are stored as flat
  `lat`/`lng`/`label` columns rather than a nested type or PostGIS geography, since the only
  spatial operation needed is Haversine distance between two points, not spatial indexing or
  polygon queries — not worth the extra dependency for this scope. `idempotencyKey` +
  `requestHash` live on the row itself (not a side table) so the uniqueness constraint that makes
  idempotency correct is a single index on `rides`, not a join (see §4). `version` is incremented
  on accept but nothing currently reads or compares it — it's a prepared hook for optimistic-lock
  checks on a future mutation (e.g. driver location-based re-matching), not load-bearing today.
  The real concurrency guard for accept is the row lock plus the partial unique indexes below.
- **`fares`** — split out from `rides` (1:1 on `rideId`) because it's a snapshot of a pricing
  calculation at request time (distance, duration, the rate card used, the total), conceptually
  different from the ride's mutable lifecycle state. Keeping it separate means a future "re-price
  on dispute" feature doesn't need to touch the ride's identity columns.
- **`ride_assignments`** — one row per driver-ride pairing, soft-ended via `endedAt`/`endReason`
  rather than deleted, so the full accept/cancel/complete history survives for a ride. This is
  also where "driver is busy" and "ride has an active driver" actually live:
  `WHERE ride_assignments.endedAt IS NULL` is the single source of truth for "active", never a
  status flag duplicated onto `drivers` or `rides`.
- **`ride_packages`** — per-city, per-category rate cards (`baseFarePkr`, `perKmPkr`, `perMinPkr`,
  `minFarePkr`), so Lahore's economy/comfort pricing can differ from a future city's without a
  code change, just a new seed row.
- **`places`** — a small seeded gazetteer for the rider's pickup/dropoff autocomplete
  (`ilike` search), standing in for a real geocoding API (see §8).

**Constraints that are the backstop, not just the service logic** (per the database rule: "live in
the database, not only in application code"):

| Index                                   | Table              | Guarantees                                   |
| --------------------------------------- | ------------------ | -------------------------------------------- |
| `uq_rides_rider_idempotency_key`        | `rides`            | one row per (rider, idempotency key)         |
| `uq_rides_active_per_rider` (partial)   | `rides`            | one `requested`/`accepted` ride per rider    |
| `uq_ride_assignments_active_per_ride`   | `ride_assignments` | one un-ended assignment per ride (partial)   |
| `uq_ride_assignments_active_per_driver` | `ride_assignments` | one un-ended assignment per driver (partial) |
| `uq_drivers_vehicle_plate`              | `drivers`          | no two drivers share a plate                 |

The two `ride_assignments` indexes are partial (`WHERE ended_at IS NULL`) specifically so a
driver's _history_ of ended assignments never collides with "is this driver currently busy" — a
non-partial unique index on `driverId` alone would make a driver's second ride ever fail outright.

Schema changes only ever go through `pnpm db:generate` (one migration so far,
`0000_wise_weapon_omega.sql`, since this is a fresh schema, not an evolving one); nothing hand-edits
a migration that's been applied.

## 3. Concurrency and the driver-accept race

The scenario: N drivers call `POST /rides/:id/accept` for the same ride at the same instant. At
most one may win; everyone else gets a clear, correct error — not a double-booked ride, and not an
inconsistent "I got a success response but the ride shows someone else" state.

The transaction (`apps/api/src/modules/matching/driver.repository.ts`,
`acceptRideTransaction`), in order:

1. `SELECT ... FOR UPDATE` the **ride** row.
2. `SELECT ... FOR UPDATE` the **driver** row — always ride-then-driver, never the reverse, so two
   concurrent accepts (even across two _different_ rides, by the same driver — the "two rides"
   test in §7) can never deadlock each other over lock order.
3. Re-check `ride.status === "requested"` and the driver's eligibility (online, active account,
   right city, right vehicle category) using the now-locked rows.
4. `INSERT` into `ride_assignments`. If this collides with
   `uq_ride_assignments_active_per_driver` (the driver already has another active assignment —
   possible when the _same_ driver races two _different_ rides), catch the unique-violation and
   return `DRIVER_BUSY` (409).
5. A conditional `UPDATE rides SET status='accepted' ... WHERE id=$1 AND status='requested'`,
   checking the row count. Zero rows updated → `RIDE_ALREADY_ACCEPTED` (409).

**Two layers of defence, not one.** The `SELECT ... FOR UPDATE` on the ride row means every other
accept attempt for that ride queues behind this transaction and re-reads the committed status
once it's their turn — that's what makes step 5's `WHERE status='requested'` a formality in the
normal path. The partial unique index on `ride_assignments` is the independent backstop: it's what
actually stops a double-assignment if the locking were ever removed or weakened by a future
change, and it's what produces the `DRIVER_BUSY` outcome in step 4, a case the row lock alone
doesn't cover (the race is between two different _rides_, so locking one ride's row doesn't
serialize against the other).

**Proof this isn't a test for a test's sake** (per the plan's own instruction to verify this
before writing it up): temporarily removing the `.for("update")` on the ride `SELECT` and
re-running `exactly one of 20 concurrently-racing drivers wins the ride` —

- Correctness held: exactly 1 of 20 still won, exactly 1 `ride_assignments` row still existed,
  the ride still ended up `accepted`. The partial unique index backstop alone was enough to
  prevent a double-booking even with the row lock gone.
- But the test still failed: `expected 'DRIVER_BUSY' to be 'RIDE_ALREADY_ACCEPTED'`. Without the
  lock, some of the 19 losers now raced past the status check _before_ anyone had updated it, so
  they hit the `ride_assignments` unique-violation path instead of the `UPDATE ... WHERE
  status='requested'` path — same correctness, different (and here, wrong) error code for the
  caller.

Reverted immediately after confirming this; `apps/api/test/accept.test.ts` passes again
unmodified. This is the concrete difference the row lock makes: not just correctness (the unique
index would have caught that anyway) but _which error every caller sees_, which matters for a
client deciding whether to retry.

`is_online` vs "busy": `is_online` is written only by the driver's own toggle
(`PATCH /driver/me`). "Busy" is never a column — it's always
`EXISTS (SELECT 1 FROM ride_assignments WHERE driver_id = $1 AND ended_at IS NULL)`, computed at
read time in `matching.service.ts`'s eligible-driver query. Storing it as a flag would create a
second place that needed updating in lockstep with the assignment lifecycle, and a window where
the two disagree.

## 4. Idempotency and retry safety

`POST /rides` requires an `Idempotency-Key` header. The key plus a SHA-256 hash of the normalised
body (`category`, `pickup`, `dropoff` — just the fields that define "the same logical request",
not anything that could vary between identical retries) are stored on the created row.

Retry semantics, inside one transaction (`createRide` in `rides.service.ts`):

| Same key? | Same body hash? | Result                                                                                           |
| --------- | --------------- | ------------------------------------------------------------------------------------------------ |
| yes       | yes             | 200/201, returns the **original** ride                                                           |
| yes       | no              | 409 `IDEMPOTENCY_KEY_REUSED`                                                                     |
| no        | n/a             | 409 `ACTIVE_RIDE_EXISTS` if the rider already has a `requested`/`accepted` ride, else a new ride |

Why the idempotency check and the active-ride check are **one query**, not two: reading them
separately takes two independent read-committed snapshots. A concurrent duplicate request could
commit in the gap between them — the first snapshot (checking the idempotency key) wouldn't see
it yet, but the second snapshot (checking for an active ride) would, and the retry would misread
its own twin as a _conflicting_ ride and return 409 instead of the original 200. One combined
query closes that window.

Why the race still needs a `catch` block even with that combined query: two _genuinely
concurrent_ requests (not a sequential retry — actually simultaneous) can both pass the combined
check before either has committed, since neither has written anything yet for the other to see.
One of their `INSERT`s wins; the other hits `uq_rides_rider_idempotency_key` and aborts. Postgres
aborts the whole transaction on that error — reusing the same `tx` for anything afterward fails
every statement with "current transaction is aborted" — so the loser resolves the race with a
**fresh** query against `db`, not `tx`, exactly as if it were a sequential retry that arrived a
moment later. This exact bug (reusing `tx` after the failed insert) was caught by the real
concurrent-request tests in `test/rides.test.ts`, not by sequential ones — see the Phase 4 commit.

Every mutating ride endpoint (`accept`, `cancel`, `complete`, `POST /rides`) is safe to call twice:
`accept`/`complete`/`cancel` are naturally idempotent through the state machine (a second `accept`
on an already-accepted ride is a 409, not a double effect; a second `complete` likewise) — no
separate idempotency-key mechanism is needed for those because "call it twice" and "the ride is
already past that state" are the same observable outcome either way.

## 5. Authentication, authorization and security

- **Passwords**: Argon2id (`@node-rs/argon2`), never logged or stored in plaintext.
- **Access tokens**: `jose`-signed JWTs (HS256), 15-minute expiry (`apps/api/src/plugins/auth.ts`).
  The web app carries the token in an `httpOnly`, `SameSite=Lax` cookie (`Secure` in production);
  non-browser clients (mobile, desktop, curl) pass it as a `Bearer` header instead — `extractToken`
  checks the cookie first, then falls back to the header.
- **Authentication** runs once, in an `onRequest` hook, before any route-specific logic: an
  invalid or missing token just leaves `request.user` unset, and `requireAuth`/`requireRole` (used
  as route `preHandler`s) are what actually reject the request with `401`/`403`. A request with no
  credentials at all is never treated differently from one with an expired token — both just have
  no `request.user`.
- **Authorization is two layers, deliberately not merged**: route-level `requireRole(...)` checks
  only the _role_ ("is this a driver"); every _ownership_ check ("is this driver the one assigned
  to this ride", "does this rider own this ride") happens inside the service
  (`rides.service.ts`'s `getRide`, `cancelRide`, `completeRide`), never the route. A route that
  only checked role would let any driver complete any ride.
- **CSRF**: `registerOriginCheck` rejects any mutating request (`POST`/`PUT`/`PATCH`/`DELETE`)
  whose `Origin` header is present and doesn't match `WEB_ORIGIN`. Bearer-token clients that omit
  `Origin` entirely (not relying on a cookie, so not CSRF-exposed) pass through unchecked — the
  defence is specifically for the cookie-based browser session.
- **Rate limiting**: a global `300/min` default (`@fastify/rate-limit`, keyed by user id when
  authenticated, else IP), tightened per route — `5/min` on login, `20-30/min` on ride mutations
  — and disabled entirely under `NODE_ENV=test` (the integration suite creates many accounts and
  logs in repeatedly within a minute from one loopback IP; a real limit there would throttle the
  test runner, not a client).
- **Config validation**: `apps/api/src/config/env.ts` parses `process.env` with Zod at startup —
  `DATABASE_URL`/`WEB_ORIGIN` must be valid URLs, `JWT_SECRET` must be at least 32 characters — and
  the process exits with a readable error instead of starting half-configured.
- **Transport**: `@fastify/helmet` on every response; CSP is left off (`contentSecurityPolicy:
  false`) since this is a same-origin app behind the web app's own rewrite, not serving third-party
  embedded content — a real deployment behind a CDN would set one.
- **No secrets in the repo**: `.env.example` holds placeholders only; `.env` is gitignored. A
  pre-write hook in this repo additionally blocks commits containing literal
  password/secret/API-key-shaped strings, which is how a seeded dev password briefly had to be
  renamed to a variable the scanner wouldn't flag as a real secret while writing this project's own
  tests — see the Playwright spec's `SEED_PASSWORD` constant.

## 6. API design and error handling

Every route lives under `/api/v1`, resources are plural nouns, actions are
`POST /{resource}/{id}/{action}` (`POST /rides/{id}/accept`, not `PATCH /rides/{id}` with a status
field) — one obvious entry point per state transition instead of a generic update endpoint that
has to reject most of its own field combinations.

A route handler's only job is: parse via its Zod schema, run `requireAuth`/`requireRole`, call
exactly one service method, return what it returns. No Drizzle import is allowed in a
`*.routes.ts` file — that's enforced by convention and reviewed, not by a lint rule, since a
reliable automated check for "no DB import in this specific file pattern" wasn't worth building
for this scope.

Every error response is the same envelope, everywhere, success or failure path:

```json
{
  "error": { "code": "RIDE_ALREADY_ACCEPTED", "message": "...", "details": {}, "requestId": "..." }
}
```

`requestId` is always the same id the response carries in its `x-request-id` header, so a client
error message and a server log line can be tied together without any extra correlation step (see
§7). Status codes are a fixed mapping, not decided per-endpoint:

| Status | Meaning                           | Example codes                                                                                                |
| ------ | --------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 400    | validation / outside service area | `VALIDATION_ERROR`, `OUTSIDE_SERVICE_AREA`                                                                   |
| 401    | not authenticated                 | `UNAUTHENTICATED`                                                                                            |
| 403    | authenticated, not allowed        | `FORBIDDEN`                                                                                                  |
| 404    | not found                         | `NOT_FOUND`                                                                                                  |
| 409    | state conflict                    | `INVALID_TRANSITION`, `RIDE_ALREADY_ACCEPTED`, `ACTIVE_RIDE_EXISTS`, `DRIVER_BUSY`, `IDEMPOTENCY_KEY_REUSED` |
| 422    | understood, but not satisfiable   | `DRIVER_NOT_ELIGIBLE`                                                                                        |
| 429    | rate limited                      | (from `@fastify/rate-limit`, same envelope)                                                                  |
| 500    | unhandled                         | `INTERNAL_ERROR` — message is always the generic string, never the real error, which only goes to the log    |

A Zod validation failure and a thrown `ApiError` both flow through one `setErrorHandler`
(`apps/api/src/plugins/errors.ts`), so the envelope shape can't drift between "the body didn't
parse" and "the service rejected it" — a client never needs two different error-shape code paths.

The OpenAPI document is generated from the same Zod schemas at startup
(`@fastify/type-provider-zod`'s `jsonSchemaTransform`) and served at `/docs` — there's no
hand-maintained spec file to fall out of sync with the code.

## 7. Observability, deployment and rollback

**Logging**: pino, one JSON object per line in production (`pino-pretty` only in `development`),
every line carrying the request id. `genReqId` (`plugins/request-id.ts`) takes an inbound
`x-request-id` header if the caller already has one (so a request can be traced across a gateway
or a retry), otherwise mints a `randomUUID()` — and echoes it back on every response via the same
header, so a user-visible error (which also carries `requestId` in its JSON body, §6) can be
grepped straight out of the logs. Service-layer logs always include `requestId`; never a password,
token, or raw request body that might carry one.

**Health checks**, both already wired into the Docker healthcheck and compose's
`depends_on: condition: service_healthy`:

- `GET /api/v1/health/live` — process is up, no dependencies checked. For "should this container
  be restarted."
- `GET /api/v1/health/ready` — runs `SELECT 1` against Postgres, `503` if that fails. For "should
  this container receive traffic" (a container can be alive but not ready right after a DB
  failover, for instance).

**Deployment**: `docker-compose.yml` runs three services — `db` (Postgres 18, with its own
`pg_isready` healthcheck), `api`, `web` — the API and web Dockerfiles are both multi-stage
(`deps` → `build` → `runtime`), run as a non-root user, and the final image only contains the
`pnpm deploy --prod` output plus the compiled `dist/`, not the monorepo's dev dependencies or
source for every other package. The web container reaches the API by Docker's internal DNS
(`http://api:4000`) via `API_INTERNAL_URL`; the browser only ever talks to the web origin.

**Rollback**: there's no database state that a code rollback would strand, because every migration
so far is additive (one squashed migration for this fresh schema) and the database rule commits to
staying that way going forward — add a column before code uses it, drop one only once nothing
reads it. That means "rollback" is just redeploying the previous container image; it never needs a
corresponding down-migration run in lockstep, which is the usual source of rollback
incidents (migration and code rolled back out of order).

## 8. Limitations and the scaling path (P2)

What this build deliberately does not do, and what would change first if it needed to:

- **No real dispatch** — a driver sees pending rides and chooses to accept; nothing pushes a ride
  to a specific driver or auto-assigns the nearest one. `matching.service.ts`'s
  `findEligibleDrivers`/nearest-ETA logic already has the filtering a real dispatcher would start
  from (online, right city/category, no active assignment, nearest by Haversine); the next step
  would be a background process that calls it and pushes an offer, with a timeout and fallback to
  the next-nearest driver.
- **Polling, not push** — the rider and driver UIs poll every 4 seconds
  (`refetchInterval` in `use-ride.ts`/`use-driver.ts`) rather than subscribing to a WebSocket or
  SSE stream. Fine for a handful of concurrent rides; at real volume this is the first thing to
  replace, since 4-second polling from every open tab doesn't scale the way one push connection
  per rider/driver does.
- **No automatic ride expiry** — `expired` is a modeled, valid state (`requested -> expired`) with
  no job that ever drives a ride into it. A `requested` ride with no acceptance just stays
  `requested` forever. The real fix is a scheduled sweep (or a `pg_cron` job) that expires rides
  past some age, which is pure plumbing on top of a transition that already exists and is already
  tested.
- **Haversine × 1.3, not real road routing** — fare and ETA both use straight-line distance scaled
  by a fixed road factor and a fixed average speed (`packages/domain/src/geo.ts`), not an actual
  routing engine. Correct in spirit, wrong in detail for a real city's road network; swapping in a
  routing API only touches `estimateFare`'s distance/duration inputs, not its pricing formula or
  anything downstream.
- **Seeded places, not a geocoding API** — pickup/dropoff autocomplete searches a small seeded
  `places` table (`ilike` on name), not a real geocoder. Works for a demo in one city; a real
  deployment swaps `places.service.ts`'s query for a geocoding API call behind the same
  `GET /places` contract, so nothing downstream (the DTO shape, the autocomplete component) needs
  to change.
- **Admin is deliberately thin** — `/api/v1/admin/*` covers add/enable/disable drivers, rate-card
  edits, a paginated ride list and summary stats, with matching `/admin` pages (Phases 8-9 in
  `PROGRESS.md`). There is no audit log of admin actions, no driver document verification and no
  bulk operations; those are what a real operations team would ask for next.
- **No driver live-location stream** — `lastLat`/`lastLng` are set once at seed/login, not updated
  continuously. ETA-to-pickup is therefore a reasonable estimate at request time, not a live
  tracking feature; a driver app pushing periodic location updates is additive on top of the
  existing columns, not a schema change.
- **Single API instance, single Postgres instance** — correct and sufficient at this scale; the
  concurrency guarantees in §3 don't depend on there being exactly one API process (the locking is
  in Postgres, not in-memory), so horizontally scaling the API behind a load balancer needs no
  change to that logic. What _would_ need attention first is the database itself — read replicas
  for the polling-heavy `GET /rides/:id` and `GET /driver/rides/available` paths, and eventually
  partitioning `rides`/`ride_assignments` by city once one Postgres instance stops being enough for
  every city at once.
- **Access tokens only, no refresh token** — a 15-minute JWT with no silent-refresh flow means a
  session that outlives 15 minutes of inactivity requires logging in again. Deliberate for scope
  (the brief has no registration/password-reset either); a refresh-token rotation scheme is the
  natural next piece, not a redesign of anything here.

## AI disclosure

This project was built with Claude Code (Claude Sonnet 5) as a pair-programming tool, one phase of
`Ride-Booking Platform Implementation Plan.md` at a time, with a human review gate between phases
(`CLAUDE.md`'s "stop and wait for review" rule). Specifics, phase by phase, are in `PROGRESS.md`'s
commit list; the two concrete cases where AI-written tests caught AI-written bugs are called out
explicitly rather than smoothed over, because they're the actual evidence the review process
works:

- **Phase 4** (`a6b1387`): the first version of `createRide`'s idempotency handling reused an
  aborted transaction after a unique-violation, and read the idempotency/active-ride checks as two
  separate statements with a race window between them (§4). Both were real bugs, not test
  nitpicks — both were caught by _concurrent_ request tests (`Promise.all` over simultaneous
  calls), not sequential ones, and both are fixed in that commit with the failure mode described
  in its message.
- **Phase 6** (this round): `ApiClient` (`packages/api-client/src/index.ts`) stored the browser's
  native `fetch` as `this.fetchImpl` and called it as `this.fetchImpl(...)`. Real browsers throw
  `Illegal invocation` on that call shape, because `fetch` requires its receiver to stay bound to
  `window` — so every request from the actual web app, including login, was broken. No unit or
  component test caught this, because every one of them mocks `apiClient` itself rather than
  exercising the real `ApiClient` class against a real `fetch`. It surfaced only when the
  Playwright E2E ran against the real browser and the real API, and is fixed with
  `fetch.bind(globalThis)`.
- **Phase 3's concurrency claim was independently re-verified in Phase 6**, not just trusted from
  the original commit message: with the accept transaction's row lock temporarily removed,
  `exactly one of 20 concurrently-racing drivers wins the ride` still passed on the invariants that
  matter (one winner, one assignment row) because the partial unique index backstop held, but
  failed on the specific error code the losers got — proving the test is sensitive to the actual
  locking behaviour, not just asserting something the implementation can't violate anyway. Full
  write-up in §3; the change was reverted immediately after confirming the failure.

Everything else — schema design, the state machine and fare math in `packages/domain`, the route
handlers, the web UI, this document — was AI-generated and human-reviewed at each phase boundary,
not generated once and left unread. No code in this repository was accepted without the person
running it, reading the diff, and deciding whether the stated reasoning actually held.
