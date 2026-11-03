---
paths:
  - "apps/web/**/*.ts"
  - "apps/web/**/*.tsx"
  - "apps/web/**/*.css"
---

# Frontend rules

- Server components by default; add `"use client"` only where interactivity, state or a browser
  API requires it.
- All API access goes through `@ride/api-client` and TanStack Query — no `fetch` calls scattered
  through components.
- Every data-bearing view handles all four states: loading (skeleton), empty, error (with retry),
  success.
- A retry reuses the same `Idempotency-Key` that was generated for the original logical request;
  never mint a new key just because the user clicked retry.
- Ride-status polling runs every 4 seconds and stops once the ride reaches a final status
  (`completed`, `cancelled`, `expired`).
- Shared UI only from `apps/web/src/components/ui` (shadcn) and `components/layout`. No one-off
  copies of a button, input, or page shell.
- Use design tokens (Tailwind theme values / CSS variables), not hard-coded colour values.
- Mobile-first responsive layout; check 360px, 768px and 1280px.
- Accessible by default: every input has a label, all interactive elements are keyboard
  reachable, focus is visible.
- `middleware.ts` only redirects for UX. It is never the place that decides whether an action is
  allowed — the API re-checks role and ownership on every request regardless.
