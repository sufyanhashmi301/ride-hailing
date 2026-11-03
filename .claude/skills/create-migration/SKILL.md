---
name: create-migration
description: Use when a schema change is needed in packages/db — adding/altering a table, column, constraint or index. Walks through generating, reviewing and applying the migration safely.
---

# Create migration

1. **Read the rules** — `.claude/rules/database.md` — before touching anything.
2. **State the change and its compatibility** — one sentence on what's changing and why it's
   backward-compatible (or, if it can't be, flag that explicitly and ask before proceeding).
3. **Edit the schema** — update the Drizzle table definitions in `packages/db/src/schema/`.
4. **Hand-write what drizzle-kit can't generate** — partial unique indexes, multi-column `CHECK`
   constraints, etc. go in a raw SQL block (drizzle-kit supports `sql` custom migrations) rather
   than being approximated through the schema DSL.
5. **Generate** — run `pnpm db:generate`.
6. **Show the SQL** — print the generated migration file's contents before applying anything.
   Wait for confirmation if the change touches a table that already has data-bearing tests.
7. **Apply and seed** — `pnpm db:migrate` then `pnpm db:seed`.
8. **Constraint test** — add or update a test that proves the new constraint actually rejects bad
   data (not just that the happy path still works).
9. **Full test run** — `pnpm test`, report the real output.
