"use client";

import { useRef } from "react";

/**
 * One key per logical request: a retry must reuse the same key, and only resets when the caller
 * explicitly starts a new logical request (e.g. the user changes the ride form and resubmits).
 */
export function useIdempotencyKey() {
  const keyRef = useRef<string | null>(null);

  function getKey(): string {
    keyRef.current ??= crypto.randomUUID();
    return keyRef.current;
  }

  function resetKey(): void {
    keyRef.current = null;
  }

  return { getKey, resetKey };
}
