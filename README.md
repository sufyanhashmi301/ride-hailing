# Ride Platform

A ride-booking platform for Lahore, Pakistan: one REST API, one Next.js web app for riders,
drivers and admins, one PostgreSQL database. Built for a 6-8 hour take-home assessment, scoped so
correctness and clarity beat feature count.

| Document                                                                   | What's in it                                                             |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [`docs/architecture-questions.md`](./docs/architecture-questions.md)       | The brief's eight architecture questions, answered, with diagrams        |
| [`docs/requirements-coverage.md`](./docs/requirements-coverage.md)         | Every brief requirement → code → test, assumptions, reviewer walkthrough |
| [`docs/architecture.md`](./docs/architecture.md)                           | Full design write-up: schema, concurrency, idempotency, security, limits |
| [`docs/decisions/0001-tech-stack.md`](./docs/decisions/0001-tech-stack.md) | Tech stack decision record                                               |
| [`PROGRESS.md`](./PROGRESS.md)                                             | Build phases and their commits                                           |

## Quick start (local dev)

Prerequisites: Node.js 24+, pnpm (`corepack enable` if missing), Docker Desktop.

```bash
cp .env.example .env        # fill in real local values; never commit .env
                            # JWT_SECRET must be 32+ chars, e.g.:
                            # node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
pnpm install
docker compose up -d db
pnpm db:migrate
pnpm db:seed                # safe to re-run
pnpm dev                    # web http://localhost:3000, api http://localhost:4000, docs /docs
```

The API refuses to start, and says which variable is wrong, if `.env` is incomplete.

### Seeded accounts

All seeded accounts share one dev password: the `SEED_PASSWORD` constant in
[`packages/db/src/seed.ts`](./packages/db/src/seed.ts).

| Role   | Accounts                                                                                                   |
| ------ | ---------------------------------------------------------------------------------------------------------- |
| Rider  | `rider1@ride.local`, `rider2@ride.local`, `rider3@ride.local`                                              |
| Driver | `driver1@ride.local` … `driver10@ride.local` (odd = Economy, even = Comfort; all start offline, in Lahore) |
| Admin  | `admin@ride.local`                                                                                         |

A driver must switch **online** before rides appear for them. Good test places: _Liberty Market_
→ _Packages Mall_.

## Run the whole stack in Docker

```bash
cp .env.example .env                 # needs JWT_SECRET; compose reads it for substitution
docker compose up -d db
pnpm install && pnpm db:migrate && pnpm db:seed   # migrations run as a one-off step, not on container start
docker compose up -d --build api web
# web http://localhost:3000, api http://localhost:4000/docs
```

The images are multi-stage and run as a non-root user. Migrations are deliberately not run on
container start, so multiple API replicas never race to apply them.

## Scripts

| Command                                       | Does                                          |
| --------------------------------------------- | --------------------------------------------- |
| `pnpm dev`                                    | Runs the API and web app together (Turborepo) |
| `pnpm build`                                  | Builds all apps and packages                  |
| `pnpm lint` / `pnpm format`                   | Biome check / check --write                   |
| `pnpm typecheck`                              | `tsc --noEmit` across the workspace           |
| `pnpm test` / `pnpm test:e2e`                 | Unit + integration tests / Playwright E2E     |
| `pnpm db:generate` / `db:migrate` / `db:seed` | Drizzle migration and seed workflow           |

## Project structure

```
apps/api/       Fastify REST API (modules, plugins, config)
apps/web/       Next.js app (rider/driver/admin route groups)
packages/contracts/  Zod schemas + DTOs shared by API and clients
packages/domain/     Pure business rules (state machine, fares)
packages/db/         Drizzle schema, migrations, seeds
packages/api-client/ Typed REST client
docs/                Architecture write-up and decision records
```

See [`CLAUDE.md`](./CLAUDE.md) for the full layering and business-rule reference.

## Testing

```bash
pnpm test                               # everything: domain unit, API integration, web component
pnpm --filter @ride/domain test         # pure rules: state machine, fares, Haversine
pnpm --filter @ride/api test            # API integration, real Postgres via Testcontainers
pnpm --filter @ride/api test -- accept  # just the concurrent-accept race tests
pnpm --filter @ride/web test            # React component tests (loading / error / empty states)
pnpm test:e2e                           # Playwright; needs `pnpm dev` running on a migrated + seeded DB
pnpm lint && pnpm typecheck
```

API integration tests start their own throwaway PostgreSQL container, so **Docker must be
running**, but they never touch your dev database. Nothing involving transactions or locking is
mocked. For a requirement-by-requirement map of which test covers what, see
[`docs/requirements-coverage.md`](./docs/requirements-coverage.md#5-testing-requirements).

## API

Interactive OpenAPI docs: **http://localhost:4000/docs**. The spec is generated from the same Zod
schemas that validate requests, so it can't drift from the code. Every error uses one envelope:
`{ "error": { "code", "message", "details", "requestId" } }`.

Example flow with curl (bash; browser clients use the session cookie instead of a Bearer token):

```bash
API=http://localhost:4000/api/v1
PW='<SEED_PASSWORD from packages/db/src/seed.ts>'
login() { curl -s -X POST $API/auth/login -H 'content-type: application/json' \
  -d "{\"email\":\"$1\",\"password\":\"$PW\"}" | jq -r .token; }

RIDER=$(login rider1@ride.local)
DRIVER=$(login driver1@ride.local)
TRIP='{"category":"economy",
  "pickup":{"lat":31.5125,"lng":74.3458,"label":"Liberty Market"},
  "dropoff":{"lat":31.4789,"lng":74.363,"label":"Packages Mall"}}'

# Fare + pickup ETA for both categories
curl -s -X POST $API/rides/estimate -H "authorization: Bearer $RIDER" \
  -H 'content-type: application/json' -d "$TRIP" | jq

# Request a ride. Re-running with the SAME key returns the same ride (200, not a duplicate).
KEY=$(uuidgen)
RIDE=$(curl -s -X POST $API/rides -H "authorization: Bearer $RIDER" \
  -H 'content-type: application/json' -H "idempotency-key: $KEY" -d "$TRIP" | jq -r .id)

# Driver goes online, then accepts. A second accept (by anyone) gets 409 RIDE_ALREADY_ACCEPTED.
curl -s -X PATCH $API/driver/me -H "authorization: Bearer $DRIVER" \
  -H 'content-type: application/json' -d '{"isOnline":true,"lastLat":31.51,"lastLng":74.35}'
curl -s -X POST $API/rides/$RIDE/accept -H "authorization: Bearer $DRIVER" | jq .status

# Status, then complete. Completing again gets 409 INVALID_TRANSITION.
curl -s $API/rides/$RIDE -H "authorization: Bearer $RIDER" | jq .status
curl -s -X POST $API/rides/$RIDE/complete -H "authorization: Bearer $DRIVER" | jq .status

# Cancelling is rider/admin only, while requested or accepted:
# curl -s -X POST $API/rides/$RIDE/cancel -H "authorization: Bearer $RIDER" \
#   -H 'content-type: application/json' -d '{"reason":"changed plans"}'
```

## Memory

Two different things are both called "memory" here, and they're not interchangeable:

- **`CLAUDE.md`** — shared, versioned instructions I maintain by hand. This is the source of
  truth for project rules, business logic and layering.
- **Auto memory** — Claude's own private notes across sessions (inspect with `/memory`). Useful
  for continuity, but not shared with the team and not authoritative.

If you find yourself correcting the same thing more than once, propose adding it to `CLAUDE.md`
or a `.claude/rules/*.md` file instead of relying on auto memory to remember it.

## MCP

`.mcp.json` configures tool access (GitHub, and a read-only Postgres connection), not
documentation. The Postgres MCP server must only ever point at the local dev database — never at
a staging or production connection string.

## Limitations

- **No real dispatch:** drivers choose from a list; nothing auto-assigns.
- **Polling, not push:** ride status refreshes every 4 seconds.
- **No automatic ride expiry:** an unaccepted ride waits until the rider cancels it.
- **Approximate routing:** Haversine × 1.3 instead of real road routing.
- **Seeded places** instead of a geocoding API.
- **Thin admin:** no audit log.
- **Access tokens only:** no refresh tokens.

Each limitation is written up, with what would change first, in
[`docs/architecture.md` §8](./docs/architecture.md#8-limitations-and-the-scaling-path-p2). The
three priorities before production are in
[`docs/architecture-questions.md` Q8](./docs/architecture-questions.md#8-what-are-the-three-most-important-improvements-you-would-make-before-production).

## AI disclosure

This project was built with Claude Code (Claude Sonnet 5) as a pair-programming tool, one phase of
`Ride-Booking Platform Implementation Plan.md` at a time, with a human review gate between phases.
The full disclosure — including the two cases where AI-written tests caught AI-written bugs, and
the concurrency proof redone in Phase 6 — is in
[`docs/architecture.md`'s "AI disclosure" section](./docs/architecture.md#ai-disclosure). The
development process itself (one phase at a time, stop-and-review, project-specific rules and
skills) is captured in `.claude/`.
