# Ride-Booking Platform: Implementation Plan

Nov 2, 2026 · @Sufyan Hashmi

A TypeScript monorepo with one REST API, one Next.js web app for riders, drivers and admins, and PostgreSQL, scoped to the 6–8 hour brief and built so mobile, desktop and more cities can be added later.

## Scope

P0 is built first and built properly; P1 adds one thin screen per role; P2 is designed for but only documented.

| Tier               | Includes                                                                                                                                                                                                                                                                                                               | Rule                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| P0 (must)          | Login with seeded accounts and RBAC for rider, driver, admin; rider: places, estimate, request, status, cancel; driver: online toggle, available rides, accept, complete; matching service; concurrency-safe accept; idempotency with payload hash; state machine; schema and migrations; tests; OpenAPI; Docker; docs | Done and tested before anything else |
| P1 (thin)          | Admin APIs with tests: **add driver manually**, enable/disable driver, edit package pricing, list rides. One simple admin page if time allows                                                                                                                                                                          | Admin page is the first thing cut    |
| P2 (document only) | Driver release, auto-dispatch, cities beyond Lahore, real maps, realtime updates, registration and password reset, mobile (Expo), desktop (Tauri), payments                                                                                                                                                            | Explained as the scaling path        |

**Admin adds a driver manually:** `POST /admin/drivers` with name, phone, email, vehicle category, plate and city. The API creates the user with the `driver` role and a temporary password in one transaction. The driver starts offline until they switch online.

**Demo the plan must pass:** rider logs in → sees Economy and Comfort estimates → requests → an eligible driver sees it and accepts → rider sees the driver → driver completes.

## Tech stack

Use current stable releases only, no betas or release candidates. Exact patch versions are pinned in the lockfile at scaffold time.

| Layer                    | Choice                                                       | Version policy                                                                                                                                         | Why                                                                                                   |
| ------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Runtime                  | Node.js                                                      | 26 LTS (entered LTS late October 2026); 24 LTS as fallback                                                                                             | Newest LTS line, supported to April 2029 ([Node release schedule](https://github.com/nodejs/release)) |
| Language                 | TypeScript, strict mode                                      | Latest stable                                                                                                                                          | One language for API, web, future mobile and desktop                                                  |
| Monorepo                 | pnpm workspaces + Turborepo                                  | Latest stable                                                                                                                                          | Shared packages, cached builds                                                                        |
| Lint and format          | Biome                                                        | Latest stable                                                                                                                                          | One fast tool instead of ESLint + Prettier                                                            |
| API framework            | Fastify                                                      | v5 ([docs](https://fastify.dev/docs/latest/Reference/Type-Providers/))                                                                                 | Fast, plugin-based, first-class schema validation                                                     |
| Validation and contracts | Zod v4 + `@fastify/type-provider-zod`                        | Latest stable                                                                                                                                          | Same schemas validate requests, type the client and generate OpenAPI                                  |
| API docs                 | `@fastify/swagger` + Swagger UI                              | Latest stable                                                                                                                                          | OpenAPI generated from the Zod schemas, served at `/docs`                                             |
| Database                 | PostgreSQL                                                   | 18 (19 GA is planned for 19 November 2026, so upgrade after) ([announcement](https://www.postgresql.org/about/news/postgresql-19-rc-1-released-3409/)) | Transactions, row locks, partial unique indexes                                                       |
| ORM and migrations       | Drizzle ORM + drizzle-kit                                    | Stable 0.45.x; 1.0 is still a release candidate                                                                                                        | SQL-first, typed, versioned migrations                                                                |
| Auth                     | Argon2 + `jose` (JWT)                                        | Latest stable                                                                                                                                          | Small, auditable, Bearer tokens work for mobile                                                       |
| Logging                  | pino                                                         | Latest stable                                                                                                                                          | Structured JSON logs with request IDs                                                                 |
| Web framework            | Next.js (App Router) + React 19                              | Next.js 16.x                                                                                                                                           | One deployable with role-based route groups                                                           |
| Styling                  | Tailwind CSS v4 with shared tokens                           | Latest stable                                                                                                                                          | Tokens shared later with NativeWind on mobile                                                         |
| UI components            | shadcn/ui (Radix primitives) in `apps/web/src/components/ui` | Latest stable                                                                                                                                          | Accessible, owned source, consistent across roles                                                     |
| Forms                    | React Hook Form + Zod                                        | Latest stable                                                                                                                                          | Same schemas as the API                                                                               |
| Server state             | TanStack Query                                               | v5                                                                                                                                                     | Caching, retries, ride-status polling                                                                 |
| Maps                     | Leaflet + OpenStreetMap behind `MapView`; placeholder now    | Latest stable                                                                                                                                          | Free, no API key                                                                                      |
| Testing                  | Vitest, Testcontainers, React Testing Library, Playwright    | Latest stable                                                                                                                                          | Real Postgres in tests, one E2E flow                                                                  |
| Local and deploy         | Docker Compose, Caddy later on a VPS                         | Compose v2                                                                                                                                             | Runs as-is on Hostinger or Contabo VPS                                                                |
| CI                       | GitHub Actions                                               | —                                                                                                                                                      | Lint, typecheck, test, build on every push                                                            |
| Future mobile            | Expo (React Native)                                          | P2                                                                                                                                                     | Reuses `contracts`, `api-client`, `domain`                                                            |
| Future desktop           | Tauri wrapping the admin web                                 | P2                                                                                                                                                     | Lighter than Electron                                                                                 |

## Skill set

These are the skills the build relies on, and what the interview is most likely to probe.

| Area              | Skills needed                                                                                                  | Where it shows up                |
| ----------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| TypeScript        | Strict types, generics, discriminated unions, inferring types from Zod                                         | Every package                    |
| API design        | REST resources, status codes, error envelope, idempotency keys, OpenAPI                                        | `apps/api`, `packages/contracts` |
| Concurrency       | Transactions, isolation levels, `SELECT … FOR UPDATE SKIP LOCKED`, conditional updates, race-condition testing | Ride accept, driver matching     |
| Database design   | Normalisation, foreign keys, CHECK constraints, partial unique indexes, migrations, seeding                    | `packages/db`                    |
| Domain modelling  | State machines, pure business rules, integer money                                                             | `packages/domain`                |
| Auth and security | Password hashing, JWT, RBAC, ownership checks, rate limiting, CORS, secret handling                            | API plugins, web middleware      |
| React and Next.js | App Router, server vs client components, route groups, middleware, layouts                                     | `apps/web`                       |
| UI engineering    | Design tokens, accessible components, responsive layout, loading/empty/error states                            | `apps/web/src/components`        |
| Data fetching     | TanStack Query caching, retries, polling, optimistic UI                                                        | `apps/web/src/hooks`, `apps/web` |
| Testing           | Unit, integration with Testcontainers, component tests, E2E with Playwright                                    | All packages                     |
| DevOps            | Docker, Compose, env config, CI pipelines, health checks                                                       | Root, `.github/`                 |
| Communication     | Architecture diagrams, ADR-style decisions, clear README                                                       | `docs/`                          |

## Architecture

&#91;embedded content: system architecture · 3 clients, 1 API, 1 database\]

Web, and later mobile and desktop, call the same versioned REST API through one typed client; only the API's services read or write PostgreSQL. Everything ships as Docker containers: web, API and database.

## Folder structure

Two deployable apps share four packages. UI components and React hooks stay inside the web app: shadcn/Radix components are DOM-only, so they could not be shared with React Native anyway. Design tokens are extracted when mobile starts.

```
ride-platform/
├── apps/
│   ├── api/                         # Fastify REST API (common for web, mobile, desktop)
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/            # auth.routes.ts, auth.service.ts
│   │   │   │   ├── rides/           # rides.routes.ts, rides.service.ts
│   │   │   │   ├── matching/        # matching.service.ts, driver.repository.ts
│   │   │   │   ├── drivers/         # online toggle, active city
│   │   │   │   ├── admin/           # add/disable drivers, package pricing
│   │   │   │   └── places/          # seeded Lahore places for autocomplete
│   │   │   ├── plugins/             # auth, rbac, csrf-origin, errors, request-id, rate-limit, swagger
│   │   │   ├── config/env.ts        # Zod-validated environment
│   │   │   ├── app.ts               # builds the Fastify instance (used by tests)
│   │   │   └── server.ts            # starts listening
│   │   └── test/                    # integration tests (Testcontainers)
│   └── web/                         # Next.js, single deployment
│       └── src/
│           ├── app/
│           │   ├── (site)/          # public home
│           │   ├── (auth)/login/    # one login, redirects by role
│           │   ├── rider/           # request ride, active ride status
│           │   ├── driver/          # online toggle, available rides, current ride
│           │   └── admin/           # drivers page (P1, optional)
│           ├── components/
│           │   ├── ui/              # Button, Input, Card, Badge, Skeleton (shadcn)
│           │   ├── layout/          # AppShell, Header, Sidebar, Footer
│           │   └── map/             # MapPlaceholder (same props as future MapView)
│           ├── features/            # rides/, driver/, admin/ (feature components)
│           ├── hooks/               # useRide, useRidePolling, useIdempotencyKey
│           ├── styles/              # globals.css, design tokens
│           ├── lib/                 # api client instance, session helpers
│           ├── config/nav.ts        # sidebar items per role
│           └── middleware.ts        # role-based redirects (UX only)
├── packages/
│   ├── contracts/                   # Zod schemas + DTO types shared by API and clients
│   ├── domain/                      # state machine, fare estimate, domain errors (pure TS)
│   ├── db/                          # Drizzle schema, migrations, seeds
│   └── api-client/                  # typed REST client for web, mobile, desktop
├── docs/                            # architecture.md, decisions/, diagrams
├── .github/workflows/ci.yml
├── docker-compose.yml
├── tsconfig.base.json
├── biome.json
├── .env.example
├── .gitattributes                   # LF line endings
├── CLAUDE.md                        # project rules for AI-assisted work
├── turbo.json
├── pnpm-workspace.yaml
└── README.md
```

**Services and repositories:** routes only parse, authorise and call a service. Services hold business logic and call Drizzle directly. The only repository is `driver.repository.ts` for the locking matching query, because it is complex and reused.

## Data model

Eight tables in PostgreSQL; the database itself enforces the rules that matter under concurrency.

| Table              | Key columns                                                                                                                                                                                      | Constraints and notes                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `users`            | id (uuid), email, phone, password\_hash, role, is\_active, created\_at                                                                                                                           | role CHECK in (`rider`, `driver`, `admin`); unique email                                                                                               |
| `cities`           | id, name, slug, min/max lat, min/max lng, is\_active                                                                                                                                             | Bounding box now (can include areas outside the real service region); PostGIS polygon in production                                                    |
| `drivers`          | user\_id (PK, FK users), city\_id, vehicle\_category, vehicle\_plate, is\_online, last\_lat, last\_lng, location\_updated\_at                                                                    | Created by admin; unique plate; starts offline. `is_online` is only the driver's own toggle; "busy" is derived from an active assignment, never stored |
| `ride_packages`    | id, city\_id, category, base\_fare\_pkr, per\_km\_pkr, per\_min\_pkr, min\_fare\_pkr, is\_active                                                                                                 | Unique (city\_id, category); all money as integers                                                                                                     |
| `rides`            | id, rider\_id, city\_id, category, status, pickup and dropoff lat/lng/label, idempotency\_key, request\_hash, version, requested/accepted/completed/cancelled\_at, cancelled\_by, cancel\_reason | status CHECK; unique (rider\_id, idempotency\_key); partial unique on rider\_id where status is active                                                 |
| `ride_assignments` | id, ride\_id, driver\_id, assigned\_at, ended\_at, end\_reason                                                                                                                                   | Partial unique on ride\_id where ended\_at is null; partial unique on driver\_id where ended\_at is null                                               |
| `fares`            | ride\_id (PK), distance\_m, duration\_s, road\_factor, avg\_speed\_kmh, base, per\_km, per\_min, min\_fare, total\_pkr                                                                           | Snapshot written once at request time                                                                                                                  |
| `places`           | id, city\_id, name, lat, lng                                                                                                                                                                     | Seeded Lahore landmarks for autocomplete                                                                                                               |

**Seed data:** one admin, three riders, Lahore city, Economy and Comfort packages, about 10 drivers across both categories, about 15 places.

## Ride lifecycle

&#91;embedded content: ride lifecycle · 5 states, 7 moves\]

One domain module owns every rule: `canTransition(from, to)` and `transition(ride, action, actor)`, which returns a typed domain error for invalid moves. Endpoints never check statuses themselves. Cancelling an accepted ride ends its assignment in the same transaction. Driver release is deferred to P2; an admin cancel covers a stuck ride.

## Driver matching and the accept transaction

Drivers accept manually, through a matching service that can later be swapped for auto-dispatch without touching the lifecycle.

1. Rider requests a ride (category, Lahore, pickup and destination).
2. `matching.service` finds eligible drivers: online, active account, same city, same category, no active assignment, nearest first.
3. Each eligible driver sees the pending ride in `GET /driver/rides/available`.
4. A driver calls `POST /rides/{id}/accept`, which runs one transaction:
   1. `SELECT … FOR UPDATE` the ride, then the driver row, always in that order to avoid deadlocks.
   2. Domain check: ride is `requested`; driver is online, active, same city and category.
   3. Check the driver has no active assignment.
   4. Insert the assignment.
   5. `UPDATE rides SET status = 'accepted', version = version + 1 WHERE id = $1 AND status = 'requested'`; zero rows means 409.
   6. Commit; any failure rolls back everything.
5. Every other driver now gets `409 RIDE_ALREADY_ACCEPTED`; a driver racing for two rides gets `409 DRIVER_BUSY` on one.

The partial unique indexes are the final backstop: even a bug in the service cannot assign a ride twice or give a driver two active rides. The driver's `is_online` flag is never changed by accept or complete.

## Fare and ETA estimate

Without a routing API, the fare is an estimate from straight-line distance, clearly labelled as such in the UI.

- Distance = Haversine(pickup, dropoff) × road factor 1.3.
- Duration = distance ÷ assumed Lahore average speed of 25 km/h.
- Pickup ETA = nearest eligible driver's distance ÷ the same speed; no eligible driver returns the empty state.
- All amounts in integer PKR, rounded once at the end; the rates and assumptions are stored in the `fares` snapshot.

```latex
\text{Fare} = \max\left(\text{MinFare},\; \text{Base} + \text{PerKm} \times d + \text{PerMin} \times t\right)
```

## Idempotency and retries

- `POST /rides` requires an `Idempotency-Key`; the API stores it with a SHA-256 hash of the normalised request body.
- Same key, same body: returns the original ride with 200, even if the first response was lost on the network.
- Same key, different body: `409 IDEMPOTENCY_KEY_REUSED`.
- A second active ride with a new key: `409 ACTIVE_RIDE_EXISTS`.
- The web app creates the key once per logical request and reuses it on every retry; it never generates a new key for a retry.
- Accept, cancel and complete are naturally idempotent through the state guard: repeating them returns the current ride or a 409, never a double change.

## Auth and session security

- Login only with seeded accounts; no registration or password reset in scope.
- Argon2 password hashing; 15-minute access JWT signed with `jose`.
- Web and API share one origin: Next.js rewrites `/api/*` to the API locally, Caddy does the same in production.
- Web session cookie: `httpOnly`, `Secure` (in production), `SameSite=Lax`, `Path=/`.
- CSRF: mutating requests must carry a matching `Origin` header, checked by an API plugin.
- Mobile and desktop later send the same JWT as a Bearer token; the API accepts either.
- Role and ownership are checked in services on every request; the web middleware only redirects.

## Observability, deployment and rollback

The submission documents a realistic path to production; only logging and health checks are built now.

- **Logs:** pino JSON with a request ID on every line and in every error response; `rideId`, `driverId` and `userId` in log context; assignment, cancellation and completion logged as events; database errors logged with their constraint name.
- **Health:** `/health/live` for the process, `/health/ready` for the database and applied migrations; Docker health checks use them.
- **Pipeline:** push → GitHub Actions (lint, typecheck, tests, build) → versioned Docker image → staging → smoke tests → production → health monitoring.
- **Migrations:** backward-compatible first (add columns before using them, remove only in a later release), run as a separate step before the new app starts.
- **Rollback:** redeploy the previous image tag. Rolling back code does not roll back the schema, which is why migrations stay backward-compatible.

## API and permissions

All routes live under `/api/v1`; every one checks role and ownership on the server, whatever the web middleware does.

| Method     | Endpoint                                  | Who                                 | Tier | Purpose                                                  |
| ---------- | ----------------------------------------- | ----------------------------------- | ---- | -------------------------------------------------------- |
| POST       | `/auth/login`                             | Anyone                              | P0   | Sets session cookie; returns token for Bearer clients    |
| POST       | `/auth/logout`                            | Signed in                           | P0   | Clears session cookie                                    |
| GET        | `/auth/me`                                | Signed in                           | P0   | Current user and role                                    |
| GET        | `/places?q=`                              | Signed in                           | P0   | Lahore place autocomplete                                |
| POST       | `/rides/estimate`                         | Rider                               | P0   | Fare per category + pickup ETA, or no drivers            |
| POST       | `/rides`                                  | Rider                               | P0   | Create ride; requires `Idempotency-Key`                  |
| GET        | `/rides/{id}`                             | Rider owner, assigned driver, admin | P0   | Ride, fare, driver                                       |
| POST       | `/rides/{id}/cancel`                      | Rider owner, admin                  | P0   | Cancel in `requested` or `accepted`; ends any assignment |
| PATCH      | `/driver/me`                              | Driver                              | P0   | Online toggle, active city, location                     |
| GET        | `/driver/rides/available`                 | Driver                              | P0   | Eligible pending rides from the matching service         |
| GET        | `/driver/rides/current`                   | Driver                              | P0   | The driver's active ride, if any                         |
| POST       | `/rides/{id}/accept`                      | Driver                              | P0   | Atomic assignment                                        |
| POST       | `/rides/{id}/complete`                    | Assigned driver                     | P0   | Complete and end the assignment                          |
| GET        | `/admin/drivers`                          | Admin                               | P1   | List and filter drivers                                  |
| POST       | `/admin/drivers`                          | Admin                               | P1   | **Add a driver manually**                                |
| PATCH      | `/admin/drivers/{id}`                     | Admin                               | P1   | Edit details, enable or disable                          |
| GET, PATCH | `/admin/packages`, `/admin/packages/{id}` | Admin                               | P1   | View and edit package pricing                            |
| GET        | `/admin/rides`                            | Admin                               | P1   | All rides with filters                                   |
| GET        | `/health/live`, `/health/ready`           | Anyone                              | P0   | Process alive; database reachable and migrations applied |

**Error envelope:** `{ "error": { "code": "INVALID_TRANSITION", "message": "…", "details": {}, "requestId": "…" } }`.

| Status    | Codes                                                                                                        |
| --------- | ------------------------------------------------------------------------------------------------------------ |
| 400       | `VALIDATION_ERROR`, `OUTSIDE_SERVICE_AREA`                                                                   |
| 401 / 403 | `UNAUTHENTICATED`, `FORBIDDEN`                                                                               |
| 404       | `NOT_FOUND`                                                                                                  |
| 409       | `INVALID_TRANSITION`, `RIDE_ALREADY_ACCEPTED`, `ACTIVE_RIDE_EXISTS`, `DRIVER_BUSY`, `IDEMPOTENCY_KEY_REUSED` |
| 422       | `DRIVER_NOT_ELIGIBLE`                                                                                        |
| 429       | `RATE_LIMITED`                                                                                               |

## Development rules

These rules go into `CLAUDE.md` and the README so every change, human or AI-assisted, follows them.

### Code

- TypeScript strict; no `any`, no non-null `!` without a comment saying why.
- Files in kebab-case; types and components in PascalCase; functions in camelCase.
- One module per feature: `*.routes.ts`, `*.service.ts`, optional `*.repository.ts`.
- Routes never touch the database; services never read HTTP objects.
- Business rules live in `packages/domain` as pure functions with no I/O.
- Shared code goes in a package the second time it is needed, not the first.

### API

- Every request and response has a Zod schema in `packages/contracts`.
- Versioned under `/api/v1`; plural nouns; actions as `POST /{resource}/{id}/{action}`.
- Every error uses the envelope and a stable code; never leak stack traces.
- Every mutating ride endpoint is safe to retry.

### Database

- Every schema change is a migration; never edit an applied migration.
- Money in integer PKR; timestamps as `timestamptz` in UTC.
- Integrity rules live in the database (FKs, CHECKs, partial unique indexes), not only in code.
- Multi-step writes run in one transaction.

### Frontend

- Every data view handles loading, empty, error and success.
- Shared UI only from `apps/web/src/components/ui`; no one-off copies of buttons, inputs or layouts.
- Mobile-first responsive layout, checked at 360, 768 and 1280 px.
- Accessible: labelled inputs, keyboard navigation, visible focus.

### Security

- No secrets in the repo; `.env.example` holds placeholders only.
- Config validated at startup; the app refuses to start on bad config.
- Passwords hashed with Argon2; tokens short-lived.
- Role and ownership checked in the service for every request.

### Git

- Conventional commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).
- Commit per phase at least; never commit a failing build.
- CI runs lint, typecheck, tests and build on every push.

### Definition of done

- [ ] Tests written and passing
- [ ] Types and lint clean
- [ ] OpenAPI updated
- [ ] README or docs updated when behaviour changes
- [ ] Code read and understood before committing

## Testing plan

Every test the brief lists maps to a named test; integration tests run against real PostgreSQL in Testcontainers.

| Brief requirement                  | Test                                                                                                    | Level              |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------ |
| Successful ride creation           | Rider creates a ride; fare snapshot stored; status `requested`                                          | Integration        |
| Invalid input                      | Missing fields, same pickup and dropoff, outside Lahore, bad category                                   | Integration        |
| Driver availability and assignment | Only online, active, same-city, same-category drivers with no active ride are eligible                  | Integration        |
| Concurrent driver acceptance       | 20 drivers accept one ride in parallel; exactly one succeeds, 19 get 409, one assignment row            | Integration        |
| Driver racing two rides            | One driver accepts two different rides **in parallel**; exactly one succeeds                            | Integration        |
| Invalid state transitions          | Complete a `requested` ride; cancel a `completed` ride; full transition table                           | Unit + integration |
| Cancel accepted ride               | Assignment ends in the same transaction; driver becomes eligible again                                  | Integration        |
| Duplicate requests and retries     | Same key + same body returns the same ride; same key + different body is 409; second active ride is 409 | Integration        |
| RBAC and ownership                 | Rider calls admin endpoints; driver completes another driver's ride; rider reads another rider's ride   | Integration        |
| Admin adds driver (P1)             | User + driver created in one transaction; duplicate plate rejected                                      | Integration        |
| Fare estimate                      | Haversine, road factor, minimum fare, integer rounding                                                  | Unit               |
| Frontend loading and error states  | Ride form and status view show skeleton, error with retry (same idempotency key), empty                 | Component          |
| End to end                         | Rider requests, driver accepts, rider sees the driver, driver completes                                 | Playwright         |

**Proof the concurrency test is real:** temporarily remove the conditional update and confirm the test fails. Note this in the README's AI-disclosure section.

## Phases and time budget

P0 takes about 7.75 hours; the admin APIs add 0.5. If time runs short, cut UI polish and the admin page first, never concurrency tests, database integrity or docs. The first milestone is the schema, the state machine and a concurrency-safe accept, not the UI.

| Phase                   | Work                                                                                                                                               | Tier | Hours    |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | -------- |
| 0. Scaffold             | Monorepo, configs, Docker Compose, env validation, health checks, logging, CI, `CLAUDE.md`                                                         | P0   | 0.5      |
| 1. Data                 | Drizzle schema, migrations, constraints, partial unique indexes, seed script                                                                       | P0   | 0.75     |
| 2. Domain               | State machine, fare estimate, domain errors + unit tests                                                                                           | P0   | 0.5      |
| 3. Auth and API         | Login, RBAC, Origin check, estimate, create with idempotency hash, accept transaction, cancel, complete, driver endpoints, error envelope, OpenAPI | P0   | 1.5      |
| 4. Integration tests    | Concurrency, retries, transitions, RBAC against real Postgres                                                                                      | P0   | 1.5      |
| 5. Rider and driver web | Login, AppShell, ride form, estimate, status polling, driver toggle, available rides, accept, complete, all states                                 | P0   | 1.75     |
| 6. Frontend tests       | Component tests for loading and error states, one Playwright E2E                                                                                   | P0   | 0.5      |
| 7. Docs                 | README, architecture answers, diagrams, limitations, AI disclosure, secret scan                                                                    | P0   | 0.75     |
| 8. Admin APIs           | Add driver, enable/disable, package pricing, ride list + tests                                                                                     | P1   | 0.5      |
| 9. Admin page           | One drivers page, only if time remains                                                                                                             | P1   | (0.5)    |
| **Total**               |                                                                                                                                                    |      | **8.25** |

Each phase ends with a commit and a green CI run. I stop after Phase 0 for your review.
