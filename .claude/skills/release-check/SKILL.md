---
name: release-check
description: Use before considering the submission done — full clean-tree verification plus every checklist item from the assessment brief (README, OpenAPI, schema, tests, architecture doc, limitations, AI disclosure).
---

# Release check

1. Confirm a clean working tree (`git status`).
2. `pnpm install --frozen-lockfile`.
3. `pnpm lint`, `pnpm typecheck`, `pnpm build` — all must pass.
4. Run migrations from zero against a fresh database and confirm they apply cleanly.
5. `pnpm test` (all unit + integration) and `pnpm test:e2e` — all must pass.
6. `docker compose up --build` and confirm `/health/live`, `/health/ready` and the web app
   respond, then tear it down.
7. Run the `security-check` skill's steps and include its table.
8. Verify every submission item from the brief is present: README, OpenAPI spec reachable at
   `/docs`, DB schema, tests, `docs/architecture.md` answers + diagram, a limitations section, and
   an AI-disclosure section.

Report pass/fail per step with real command output, not a summary claim.
