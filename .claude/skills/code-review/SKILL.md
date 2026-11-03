---
name: code-review
description: Use when asked to review the current changes (git diff) against this project's own CLAUDE.md and .claude/rules — not a general code review, a project-specific one.
---

# Code review (project rules)

Review `git diff` (or the range given) against `CLAUDE.md` and the path-scoped rules in
`.claude/rules/`. Read-only: report findings, don't edit unless explicitly asked to.

Checklist:

- **Layering** — routes don't touch the DB; services don't touch HTTP objects; no new generic
  repository.
- **Transactions** — multi-step writes are in one transaction; lock order is ride then driver;
  conditional updates check row count.
- **Integrity** — constraints that matter live in the database, not only in application code.
- **Validation** — every request/response has a Zod schema; no `any`.
- **Errors** — error envelope and a stable code; no leaked stack traces or raw DB errors.
- **Security** — role/ownership checks, no secrets, parameterised queries.
- **Tests** — new behaviour has a test; no loosened assertions; concurrency/transaction tests use
  real Postgres.
- **Frontend** — four states handled; shared UI components reused; mobile-first.

Output three sections — **Must fix**, **Should fix**, **Nit** — each item as `file:line —
description`. If a section is empty, say so briefly; don't pad it.
