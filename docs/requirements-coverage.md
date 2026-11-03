# Requirements coverage

Maps every item in the assessment brief to where it's implemented and how it's tested, then
lists the assumptions made and gives reviewers a short guided walkthrough.

- Architecture questions (brief §4): [`architecture-questions.md`](./architecture-questions.md)
- Full design write-up: [`architecture.md`](./architecture.md)

---

## 2A. Frontend application

| Requirement                       | Where                                                                                                                     | Tested by                                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Pickup and destination inputs     | `features/rides/place-autocomplete.tsx` (searches seeded Lahore places)                                                   | `e2e/ride-lifecycle.spec.ts`                                         |
| Economy / Comfort selection       | `features/rides/ride-request-form.tsx` (one card per category)                                                            | `e2e/ride-lifecycle.spec.ts`                                         |
| Estimated fare and pickup ETA     | `POST /rides/estimate` → fare breakdown and nearest-driver ETA per category                                               | `rides.test.ts` "returns fare and ETA estimates for both categories" |
| Request button                    | `ride-request-form.tsx`, sends an `Idempotency-Key` that is reused on retry                                               | `ride-request-form.test.tsx`, e2e                                    |
| Confirmation and status view      | `app/rider/book/page.tsx` + `features/rides/ride-status-card.tsx`, polls every 4 s and stops at a final status            | e2e (requested → accepted → completed)                               |
| Loading / success / empty / error | Every data view: skeleton, data, empty message, error with Retry                                                          | `ride-request-form.test.tsx`, `available-rides-list.test.tsx`        |
| Cancel where permitted            | "Cancel ride" button in `rider/book/page.tsx`, shown only while `requested`/`accepted`; the server enforces the same rule | `rides.test.ts` cancel suite                                         |
| Map                               | `components/map/map-placeholder.tsx`, a simplified placeholder with the same props a real map component would take        | n/a                                                                  |
| Responsive                        | Tailwind, mobile-first; checked at 360 / 768 / 1280 px                                                                    | manual                                                               |

## 2B. Backend API

All routes are under `/api/v1`. The full interactive OpenAPI spec is at `http://localhost:4000/docs`.

| Brief endpoint              | Implemented                | Who                                 | Notes                                                               |
| --------------------------- | -------------------------- | ----------------------------------- | ------------------------------------------------------------------- |
| `POST /rides`               | `POST /rides`              | rider                               | Requires `Idempotency-Key`. `201` when created, `200` when replayed |
| `GET /rides/{id}`           | `GET /rides/:id`           | owner rider, assigned driver, admin | Others get `403`                                                    |
| `POST /rides/{id}/accept`   | `POST /rides/:id/accept`   | driver                              | Locking transaction (see Q2)                                        |
| `POST /rides/{id}/cancel`   | `POST /rides/:id/cancel`   | owner rider, admin                  | Ends the driver's assignment, freeing them                          |
| `POST /rides/{id}/complete` | `POST /rides/:id/complete` | assigned driver                     | Repeat calls get `409 INVALID_TRANSITION`                           |

**Added endpoints:**

- **Rider:** `POST /rides/estimate`, `GET /rides` (own history), `GET /places?q=`.
- **Driver:** `GET`/`PATCH /driver/me` (online toggle, location), `GET /driver/rides/available`,
  `GET /driver/rides/current`, `GET /driver/rides`.
- **Admin:** `/admin/drivers`, `/admin/cities`, `/admin/packages/:id`, `/admin/rides`,
  `/admin/stats`.
- **Auth:** `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`.
- **Health:** `GET /health/live`, `GET /health/ready`.

## 2C. Driver matching

| Requirement                  | How                                                                                                                                                       |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Driver availability          | `drivers.is_online` is the driver's own toggle. "Busy" is never stored; it's derived from an active `ride_assignments` row.                               |
| Selecting an eligible driver | Online, account active, same city, same vehicle category, and no active assignment. Applied in `matching.service.ts` and re-checked under lock on accept. |
| No double accept             | Ride row lock + conditional `UPDATE ... WHERE status='requested'` + partial unique indexes (Q2)                                                           |
| Simultaneous requests        | Locks are always taken ride first, then driver (no deadlocks); a unique violation maps to `409 DRIVER_BUSY`                                               |
| Invalid transitions          | `packages/domain/src/ride-lifecycle.ts` whitelists transitions; anything else is `409 INVALID_TRANSITION`                                                 |
| Nearby discovery in prod     | Haversine × 1.3 today; Redis GEO or PostGIS with a live location stream in production (Q5, item 4)                                                        |

## 2D. Database

`packages/db/src/schema/index.ts`, migration `packages/db/migrations/0000_wise_weapon_omega.sql`.

| Brief entity           | Table(s)                                                                          |
| ---------------------- | --------------------------------------------------------------------------------- |
| Riders                 | `users` (`role = 'rider'`)                                                        |
| Drivers + availability | `users` + `drivers` (1:1, `is_online`, vehicle, city, last location)              |
| Ride requests          | `rides` (status, pickup/dropoff, idempotency key + request hash)                  |
| Driver assignments     | `ride_assignments` (soft-ended with `ended_at`/`end_reason`, so history is kept)  |
| Fare information       | `fares` (1:1 snapshot of the calculation) + `ride_packages` (per-city rate cards) |

Integrity rules enforced by the database itself are listed in
[architecture.md §2](./architecture.md#2-data-model-and-schema-design).

## 3. Engineering requirements

| #   | Requirement                    | Where                                                                                                                           |
| --- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Separation of layers           | `apps/web` → `packages/api-client` → `*.routes.ts` → `*.service.ts` → Drizzle; pure rules in `packages/domain`                  |
| 2   | Validation + consistent errors | Zod schema on every route; one error handler (`plugins/errors.ts`) produces `{ error: { code, message, details, requestId } }`  |
| 3   | Transactions + concurrency     | `db.transaction` for every multi-step write; locking accept in `matching/driver.repository.ts`                                  |
| 4   | Duplicate / retry protection   | Idempotency key + body hash on `POST /rides`; state machine for the other mutations (Q3)                                        |
| 5   | Automated tests                | See the next section                                                                                                            |
| 6   | Env config + secrets           | `apps/api/src/config/env.ts` (Zod, exits on bad config); `.env` gitignored, `.env.example` has placeholders only; log redaction |
| 7   | Docker / reproducible setup    | `docker-compose.yml` (db, api, web), multi-stage non-root Dockerfiles; README quick start                                       |
| 8   | API documentation              | OpenAPI generated from the Zod schemas, Swagger UI at `/docs`; curl examples in the README                                      |
| 9   | Logging + error handling       | pino JSON with `requestId` on every line, echoed in the `x-request-id` header and error bodies; 5xx never leak internals        |

## 5. Testing requirements

| Brief item                       | Tests                                                                                                                                           |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Successful ride creation         | `apps/api/test/rides.test.ts` "creates a ride and stores a fare snapshot"                                                                       |
| Invalid input                    | `rides.test.ts`: missing fields, same pickup/dropoff, unknown category, outside service area, missing `Idempotency-Key`                         |
| Driver availability + assignment | `drivers.test.ts` (online/city/category filtering, current ride), `accept.test.ts` (offline / wrong category / disabled → 422)                  |
| Concurrent driver acceptance     | `accept.test.ts`: 20 drivers race one ride (exactly one wins); one driver races two rides (wins exactly one)                                    |
| Invalid state transitions        | `packages/domain/src/ride-lifecycle.test.ts` (every pair); API: accept twice, cancel cancelled/completed, complete twice, complete after cancel |
| Duplicate requests / retries     | `rides.test.ts`: replay returns original, key reuse with a different body → 409, plus three concurrent-race variants                            |
| Frontend loading + error states  | `ride-request-form.test.tsx`, `available-rides-list.test.tsx` (loading, error + retry, empty, lost accept race)                                 |
| End-to-end                       | `apps/web/e2e/ride-lifecycle.spec.ts` (rider books → driver accepts → driver completes), `e2e/admin.spec.ts`                                    |

API integration tests run against **real PostgreSQL** via Testcontainers; nothing that touches a
transaction or lock is mocked.

## 6. Submission checklist

- [x] Git repository with source
- [x] README with setup, run and test instructions
- [x] Schema and migrations (`packages/db`)
- [x] Automated tests and how to run them
- [x] API docs (`/docs`) and example requests (README)
- [x] Architecture diagram and design notes (`architecture.md`, `architecture-questions.md`)
- [x] Known limitations and proposed improvements (`architecture.md` §8, Q8)
- [x] AI disclosure and verification (`architecture.md`, "AI disclosure")
- [x] No secrets committed (`.env` gitignored; a pre-write secret-scan hook in `.claude/hooks/`)

---

## Assumptions

- **Single city at launch.** Lahore only, with service-area bounds, but the schema is multi-city.
  Requests outside the bounds return `400 OUTSIDE_SERVICE_AREA`.
- **Drivers pull, they don't get pushed.** "Assign a driver" happens when an eligible driver
  accepts from their list of nearby pending rides (nearest pickup first). Nothing auto-assigns.
  This keeps the concurrency problem explicit and testable; auto-dispatch is the next step (Q8).
- **The fare is fixed at request time.** It's estimated when the ride is requested and stored as a
  snapshot; there's no recalculation at completion (no waiting time, tolls or surge).
- **Distance and time** are Haversine distance × 1.3 road factor, at an average 25 km/h.
  Money is always integer PKR.
- **One active ride per rider.** A rider can't have two `requested`/`accepted` rides at once.
- **Who may do what.**
  - Riders cancel their own ride while it is `requested` or `accepted`; admins can cancel any.
  - Drivers can't cancel an accepted ride in this scope.
  - Only the assigned driver can complete.
- **Simplified lifecycle.** There are no `arrived`/`in_progress` states between accept and
  complete. `expired` exists in the state machine, but no job triggers it yet (Q8).
- **No payments, ratings, registration or password reset**, since the brief doesn't ask for them.
  Accounts come from the seed script or the admin "add driver" form.

---

## Reviewer walkthrough (about 15 minutes)

1. **Start it:** follow the README quick start. Seeded accounts are listed there.
2. **Happy path:** sign in as `rider1@ride.local` and book a ride
   (Liberty Market → Packages Mall, Economy). In a private window, sign in as
   `driver1@ride.local` (economy), go online, and accept it. The rider's screen switches to
   "accepted" within about 4 seconds. Complete it as the driver.
3. **The race, by hand:** book another ride as the rider. Open two driver sessions in separate
   private windows, `driver1` and `driver3` (both economy, both online), and click Accept in both
   at the same moment. One sees the ride; the other sees "This ride has already been accepted",
   and the ride disappears from their list.
4. **The race, for real:** `pnpm --filter @ride/api test -- accept` runs 20 concurrent accepts
   against real Postgres.
5. **Retry safety:** run the README's curl example for `POST /rides` twice with the same
   `Idempotency-Key`. Same ride id, `201` then `200`. Change the body and keep the key: `409`.
6. **Invalid transitions:** cancel a completed ride → `409 INVALID_TRANSITION` with `from`/`to` in
   `details`.
7. **Tracing an error:** every error body has a `requestId`. Search the API logs for it to find
   the matching log line.
8. **API docs:** `http://localhost:4000/docs`.
