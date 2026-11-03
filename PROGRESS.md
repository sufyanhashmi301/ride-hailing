# Progress

Tracks phases from [Ride-Booking Platform Implementation Plan.md](<Ride-Booking Platform Implementation Plan.md>)
against actual commits. Updated at the end of each phase, per the "one phase at a time" working
rule in [CLAUDE.md](CLAUDE.md).

| #   | Phase                | Tier | Status | Commit                                                                             |
| --- | -------------------- | ---- | ------ | ---------------------------------------------------------------------------------- |
| 0   | Scaffold             | P0   | Done   | `047bff8` chore: scaffold monorepo and project tooling                             |
| 1   | Data                 | P0   | Done   | `9f02168` feat: add drizzle schema, migration, and seed data                       |
| 2   | Domain               | P0   | Done   | `008d036` feat: add ride lifecycle state machine and fare estimate domain logic    |
| 3   | Auth and API         | P0   | Done   | `f2a7028` feat: implement auth, RBAC, and the P0 ride API                          |
| 4   | Integration tests    | P0   | Done   | `a6b1387` test: harden idempotency and transition coverage, fix two real races     |
| 5   | Rider and driver web | P0   | Done   | `ea6c45a` feat: build the rider and driver web app                                 |
| 6   | Frontend tests       | P0   | Done   | `203e104` test: add frontend component and E2E tests, fix a real fetch-binding bug |
| 7   | Docs                 | P0   | Done   | `366642a` docs: write up architecture, trim README, track phase progress           |
| 8   | Admin APIs           | P1   | Done   | `a64c3af` feat: add admin APIs for driver management, pricing, and ride visibility |
| 9   | Admin page           | P1   | Done   | _(uncommitted)_ one drivers page: add driver, list, enable/disable + e2e test      |

## Notes

- Phases 0-5 are each one commit; Phase 4 also fixed two real concurrency bugs found by the new
  tests (see that commit's message).
- Phase 6's Playwright E2E caught a real bug: `ApiClient` called `this.fetchImpl(...)`, which
  throws `Illegal invocation` on native browser `fetch` (it requires `this` bound to `window`).
  Every component test mocked `apiClient` directly so none of them caught it — login was broken
  in a real browser until this. Fixed in `packages/api-client/src/index.ts` with
  `fetch.bind(globalThis)`.
- Phase 7's `security-check` skill pass found no secrets and a compliant cookie/CSRF/JWT/rate-limit
  setup; 2 moderate transitive advisories (`glob`/`minimatch` via `@fastify/swagger-ui`) and a
  log-redaction gap (no explicit pino `redact` config, though nothing currently logs a body or
  token) were reported but not fixed, per the skill's "report, don't fix" rule.
- Phase 8 adds `admin.ts` under `packages/contracts`, `apps/api/src/modules/admin`, and matching
  `api-client` methods, following the same routes/service layering as every other module.
  `POST /admin/drivers` creates the user + driver row in one transaction with a generated
  temporary password (never logged, returned once in the response); duplicate email/plate map to
  new `EMAIL_ALREADY_EXISTS`/`VEHICLE_PLATE_ALREADY_EXISTS` 409s via the unique-constraint catch,
  consistent with how `createRide` handles its own unique violations. `GET /admin/rides` uses
  simple limit/offset pagination — a keyset cursor wasn't worth the complexity for a thin P1 admin
  list.
- Phase 9 adds the one admin page the plan calls for: `/admin` lists drivers with an
  enable/disable toggle and a form to add one, backed by two small read endpoints
  (`GET /admin/drivers`, `GET /admin/cities`) that Phase 8 hadn't needed yet. The temporary
  password is shown once in the create-driver success message, never persisted client-side.
  Verified against a real browser with a new `apps/web/e2e/admin.spec.ts` (alongside the existing
  `ride-lifecycle.spec.ts`), which surfaced a real Next.js behavior worth noting: the previous
  route (the login form) stays mounted off-screen (`display:none`) after a client-side navigation,
  for instant back/forward nav — so e2e locators that rely on an accessible name (`getByLabel`)
  must scope to the visible `<main>`, or they can match the hidden previous page's same-named
  field too. Not a regression, just the first page to collide with it.
- Both P1 phases are done; P0 and P1 are now fully built per the plan's scope.
