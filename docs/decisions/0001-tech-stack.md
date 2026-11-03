# 0001: Tech stack

## Context

This is a 6-8 hour take-home: a ride-booking platform for Lahore, Pakistan, with rider, driver
and admin roles, built to be correct and clearly explained rather than feature-complete. It needs
to be easy to run locally, easy to extend (mobile, more cities, auto-dispatch) without a rewrite,
and easy for a reviewer to read in one sitting.

## Decision

- **Monorepo**: pnpm workspaces + Turborepo, so the API, web app and four shared packages
  (`contracts`, `domain`, `db`, `api-client`) live together with shared tooling and caching.
- **API**: Fastify 5 with `@fastify/type-provider-zod`, so one Zod schema per endpoint drives
  request validation, response typing and the generated OpenAPI doc at `/docs`.
- **Database**: PostgreSQL 18 with Drizzle ORM + drizzle-kit for typed, versioned SQL migrations.
  Postgres gives real transactions, row locks and partial unique indexes, which the driver-accept
  concurrency requirement needs.
- **Auth**: Argon2 password hashing, `jose` for JWTs. Small, auditable primitives rather than a
  full auth framework, since the brief has no registration/password-reset in scope.
- **Web**: Next.js 16 (App Router) + React 19, Tailwind v4, shadcn/ui, TanStack Query. One
  deployable serving all three roles through route groups, with a typed API client shared with
  future mobile/desktop clients.
- **Testing**: Vitest + Testcontainers for real-Postgres integration tests (critical for the
  concurrency and transaction guarantees), React Testing Library for components, Playwright for
  one end-to-end flow.
- **Lint/format**: Biome, one tool instead of ESLint + Prettier, to keep setup time down.

All versions are pinned to current stable releases (no betas/RCs) as of the scaffold date, except
Drizzle ORM, kept on the stable 0.45.x line since 1.0 is still a release candidate.

## Consequences

- Shared Zod schemas mean the API, the web forms, and the generated OpenAPI spec can never drift
  from each other silently — a schema change is felt everywhere at once, which is the point.
- Drizzle's SQL-first approach means migrations are explicit and reviewable, at the cost of
  writing a bit more by hand than a fully declarative ORM would require (e.g. partial unique
  indexes are hand-written SQL, not expressible in the schema DSL).
- Keeping UI components and hooks inside `apps/web` (not a shared package) means they can use
  Radix/shadcn freely, since those are DOM-only and wouldn't be reusable from React Native anyway.
  Design tokens are the only piece extracted when mobile work starts.
- A single Fastify service and a single Postgres database is deliberately not microservices: at
  this scale, splitting services would add operational cost without adding value, and the brief's
  scaling questions (P2) are answered in `docs/architecture.md` rather than built.
