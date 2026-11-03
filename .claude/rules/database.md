---
paths:
  - "packages/db/**/*"
  - "apps/api/src/**/*.service.ts"
  - "apps/api/src/**/*.repository.ts"
---

# Database rules

- Naming: unique constraints `uq_*`, indexes `idx_*`, check constraints `ck_*`.
- Timestamps are `timestamptz` in UTC. Money is integer PKR — never `float`/`numeric` for currency.
- Integrity rules (foreign keys, `CHECK`, partial unique indexes) live in the database, not only
  in application code — they are the backstop for the service-layer logic.
- Schema changes only happen through `pnpm db:generate` (drizzle-kit). Never hand-edit a migration
  file that has already been applied; add a new migration instead.
- Migrations are backward-compatible: add a column before code uses it, remove a column only in a
  later migration once nothing reads it. This is what makes rollback-by-redeploy safe.
- Every multi-step write runs inside one transaction (`db.transaction(async (tx) => ...)`), and
  every query inside that block uses `tx`, never the outer `db`.
- Lock order in the accept transaction is always ride row, then driver row — never the reverse —
  to avoid deadlocks.
- Map Postgres unique-violation (`23505`) to `409` with a specific error code in the service, not
  a generic 500.
- Seeds (`pnpm db:seed`) are idempotent: safe to run against a database that already has seed
  data, using upserts or existence checks, not blind inserts.
