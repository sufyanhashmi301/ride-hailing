---
name: security-check
description: Use when asked for a security pass over the project — secret scan, dependency audit, RBAC coverage, cookie/CSRF/JWT config and log redaction.
---

# Security check

Run each of these and report as a single table (`Check | Result | Notes`):

1. **Secret scan** — grep the repo for private-key headers, `sk-`/`ghp_`/`AKIA`-style tokens, and
   non-placeholder `password =` / `secret =` literals outside `.env.example`.
2. **Dependency audit** — `pnpm audit --prod`.
3. **Route -> role/ownership table** — list every route in `apps/api/src/modules/**/*.routes.ts`
   with the role(s) allowed and whether ownership is checked in the service.
4. **Cookie / CSRF / JWT** — confirm cookie flags (`httpOnly`, `Secure` in prod, `SameSite=Lax`),
   the Origin-check plugin is registered, and JWT expiry is 15 minutes.
5. **Rate limits** — confirm `@fastify/rate-limit` is applied to auth and ride-mutation routes.
6. **Log redaction** — confirm pino config redacts passwords/tokens and that no handler logs a
   raw request body that could contain one.

Report, don't fix, unless asked.
