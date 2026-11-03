# Security rules (always loaded)

- No secrets in the repo, ever. `.env.example` holds placeholders only; real values live only in
  `.env`, which is gitignored.
- Environment config is validated with Zod at startup (`apps/api/src/config/env.ts`); the process
  refuses to start on invalid config, with a clear message of what's wrong.
- Passwords are hashed with Argon2id (`@node-rs/argon2`), never stored or logged in plaintext.
- Access JWTs are short-lived (15 minutes), signed with `jose`.
- The web session cookie is `httpOnly`, `Secure` in production, `SameSite=Lax`, `Path=/`.
- Mutating requests must carry a matching `Origin` header (CSRF defence), checked in an API
  plugin before the route handler runs.
- Role and ownership are checked in the service layer on every request that touches a specific
  resource — never trust the client, and never rely on the frontend middleware alone.
- Rate limiting applies to auth and ride-mutation endpoints.
- All database access uses parameterised queries (Drizzle's query builder / tagged SQL) — never
  string-concatenated SQL.
