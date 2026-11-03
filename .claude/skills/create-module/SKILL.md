---
name: create-module
description: Use when adding a new API feature module (e.g. rides, drivers, admin) end to end — contracts, service, routes, registration, tests and client wiring in the right order.
---

# Create module

Build a new `apps/api/src/modules/<name>` feature in this order, stopping to run checks at the
end:

1. **Contracts** — add Zod request/response schemas and DTO types to
   `packages/contracts/src/`. These are the single source of truth for validation, types and
   OpenAPI.
2. **Service** — `<name>.service.ts`: business logic, calls Drizzle directly (or the one
   repository if the query is complex and reused), returns typed results or throws a domain
   error. No HTTP objects in here.
3. **Routes** — `<name>.routes.ts`: parses params, checks role, calls one service method, maps
   the result or thrown domain error to an HTTP response via the shared error envelope.
4. **Register** — wire the route plugin into `app.ts` under `/api/v1`.
5. **Repository (only if needed)** — add `<name>.repository.ts` only for a query that is both
   complex (locking, joins, raw SQL) and reused. Don't create one "just in case".
6. **Tests** — integration test(s) under `apps/api/test/` using `buildApp()` + `app.inject()`
   against Testcontainers Postgres. Cover the happy path, validation errors, and the relevant
   RBAC/ownership and state-transition cases.
7. **Client** — add the matching typed method to `packages/api-client/src/`.
8. **Verify** — run `pnpm lint`, `pnpm typecheck`, `pnpm test` and report the real output.
9. **Summary** — list the files touched and what each does, in 5 lines or fewer.
