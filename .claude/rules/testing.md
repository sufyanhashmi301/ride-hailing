---
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "**/e2e/**"
---

# Testing rules

- Name tests by behaviour, not implementation: `"returns 409 when the ride is already accepted"`,
  not `"test accept 2"`.
- Integration tests run against a real PostgreSQL instance via Testcontainers — never a mocked
  database client, especially for anything touching transactions or locking.
- Concurrency tests drive real parallelism (`Promise.allSettled` over N concurrent calls) and
  assert on the resulting database rows (exactly one assignment, exactly one `accepted` ride),
  not just on response codes.
- Each test owns isolated state (its own seeded rows / its own ride), so tests can run in any
  order without interfering with each other.
- API tests call the app through `app.inject()` against `buildApp()` — never start a real network
  listener for tests.
- Never loosen an assertion (widen a type, drop a check, change `toBe` to `toBeDefined`) just to
  make a failing test pass. Fix the underlying behaviour, or the test, deliberately and visibly.
