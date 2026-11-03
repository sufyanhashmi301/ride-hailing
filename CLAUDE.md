# Ride Platform

A TypeScript monorepo: one Fastify REST API, one Next.js web app (rider, driver, admin role
groups), PostgreSQL. 6-8 hour take-home scope. **Correctness over features** — a smaller set of
things that are actually right beats a bigger set of things that sort of work.

## Tech stack

| Layer         | Choice                                                                    |
| ------------- | ------------------------------------------------------------------------- |
| Runtime       | Node.js 24 LTS                                                            |
| Language      | TypeScript 7, strict                                                      |
| Monorepo      | pnpm workspaces + Turborepo                                               |
| Lint/format   | Biome                                                                     |
| API           | Fastify 5 + `@fastify/type-provider-zod`                                  |
| Validation    | Zod 4 (shared by API, forms, OpenAPI)                                     |
| DB            | PostgreSQL 18, Drizzle ORM + drizzle-kit                                  |
| Auth          | Argon2 password hashing, `jose` JWT                                       |
| Logging       | pino, JSON, request ID on every line                                      |
| Web           | Next.js 16 (App Router) + React 19, Tailwind v4, shadcn/ui                |
| Data fetching | TanStack Query v5                                                         |
| Testing       | Vitest, Testcontainers (real Postgres), React Testing Library, Playwright |

## Architecture and layering

```
apps/api/src/modules/<feature>/   *.routes.ts -> *.service.ts -> Drizzle
apps/api/src/plugins/             auth, rbac, origin-check, errors, request-id, swagger
packages/contracts/               Zod schemas + DTOs shared by API and clients
packages/domain/                  pure business rules (state machine, fares), no I/O
packages/db/                      Drizzle schema, migrations, seeds
packages/api-client/              typed REST client for web (and later mobile/desktop)
apps/web/src/                     app/ (route groups by role), components/, features/, hooks/
```

Routes parse, authorise, call **one** service, and return. Services hold business logic and call
Drizzle directly. Repositories exist only for complex, reused queries — currently planned:
`matching/driver.repository.ts` (the locking matching query). No generic repository layer.

## Core business rules

- Ride states: `requested -> accepted -> completed`; `requested|accepted -> cancelled`; optional
  `expired`. Any other transition is `409 INVALID_TRANSITION`.
- Accept is one transaction: `SELECT ... FOR UPDATE` the ride, then the driver row (always that
  order, to avoid deadlocks), then a conditional
  `UPDATE rides SET status='accepted' WHERE id=$1 AND status='requested'` and check the row count.
  Zero rows updated means someone else got there first -> 409.
- `is_online` is only the driver's own toggle. "Busy" is derived from having an active
  `ride_assignments` row, never stored on the driver.
- Partial unique indexes are the backstop even if the service has a bug: one active assignment per
  ride, one active assignment per driver, one active ride per rider.
- Idempotency: `POST /rides` requires an `Idempotency-Key`; store it with a SHA-256 hash of the
  normalised body. Same key + same body -> return the original ride. Same key + different body ->
  409. All money is integer PKR.
- Fare: `max(minFare, base + perKm*d + perMin*t)`, distance = Haversine x 1.3, speed = 25 km/h.

## Commands

```
pnpm dev / build / lint / format / typecheck / test / test:e2e
pnpm db:generate / db:migrate / db:seed
docker compose up -d db
```

## Working rules

- One phase at a time. Stop and wait for review at the end of each phase.
- State which files you're about to change before changing them.
- After changes, run lint, typecheck and tests and report the real output — never claim a result
  you didn't see.
- Ask before: adding a dependency, changing an already-applied migration, changing a business
  rule in this file, or touching `.env*`.

## Restrictions

- Never edit an applied migration or a generated file (`*.gen.ts`, `next-env.d.ts`).
- Never weaken a test to make it pass.
- Never mock the database in a transaction or concurrency test — use real Postgres
  (Testcontainers).
- No `any`.

@docs/architecture.md
