# Ride Platform

A ride-booking platform for Lahore, Pakistan: one REST API, one Next.js web app for riders,
drivers and admins, one PostgreSQL database. Built for a 6-8 hour take-home assessment, scoped so
correctness and clarity beat feature count. See
[`Ride-Booking Platform Implementation Plan.md`](./Ride-Booking%20Platform%20Implementation%20Plan.md)
for the full plan and [`docs/architecture.md`](./docs/architecture.md) for the design write-up.

## Quick start

Prerequisites: Node.js 24+, pnpm (`corepack enable` if missing), Docker Desktop.

```bash
cp .env.example .env        # fill in real local values; never commit .env
pnpm install
docker compose up -d db
pnpm db:migrate
pnpm db:seed
pnpm dev                    # web on :3000, api on :4000 (docs at /docs)
```

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

Integration tests run against a real PostgreSQL instance via Testcontainers — Docker must be
running. `pnpm test` runs everything through Turborepo; `pnpm --filter @ride/api test` scopes to
one package.

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

No real dispatch (drivers choose, nothing auto-assigns), polling instead of push for ride status,
no automatic ride expiry, Haversine × 1.3 instead of real road routing, seeded places instead of a
geocoding API, and no admin API/page yet (P1, cut first per the plan). Each of these is written up
with what would change first in [`docs/architecture.md` §8](./docs/architecture.md#8-limitations-and-the-scaling-path-p2).
Phase-by-phase status is in [`PROGRESS.md`](./PROGRESS.md).

## AI disclosure

This project was built with Claude Code (Claude Sonnet 5) as a pair-programming tool, one phase of
`Ride-Booking Platform Implementation Plan.md` at a time, with a human review gate between phases.
The full disclosure — including the two cases where AI-written tests caught AI-written bugs, and
the concurrency proof redone in Phase 6 — is in
[`docs/architecture.md`'s "AI disclosure" section](./docs/architecture.md#ai-disclosure). The
development process itself (one phase at a time, stop-and-review, project-specific rules and
skills) is captured in `.claude/`.
