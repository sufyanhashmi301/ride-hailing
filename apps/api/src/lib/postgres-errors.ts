const UNIQUE_VIOLATION = "23505";

/** Drizzle wraps driver errors in a DrizzleQueryError; the pg error with `.code`/`.constraint` is its `.cause`. */
function pgError(error: unknown): { code?: unknown; constraint?: unknown } | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  if ("code" in error) return error as { code?: unknown; constraint?: unknown };
  if ("cause" in error) return pgError((error as { cause?: unknown }).cause);
  return undefined;
}

export function isUniqueViolation(error: unknown): boolean {
  return pgError(error)?.code === UNIQUE_VIOLATION;
}

export function uniqueViolationConstraint(error: unknown): string | undefined {
  if (!isUniqueViolation(error)) return undefined;
  const constraint = pgError(error)?.constraint;
  return typeof constraint === "string" ? constraint : undefined;
}
