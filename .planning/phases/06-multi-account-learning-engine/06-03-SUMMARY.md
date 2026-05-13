---
phase: "06"
plan: "03"
subsystem: "edit-capture"
tags: [server-action, learning-engine, voice-corrections, client-component]
dependency_graph:
  requires: ["06-01", "06-02"]
  provides: ["edit-capture-action", "log-published-version-form"]
  affects: ["06-04"]
tech_stack:
  added: ["edit-patterns stub (forward compatibility)"]
  patterns: ["fire-and-forget dynamic import", "accountId prop threading", "collapsible form UX"]
key_files:
  created:
    - src/app/actions/log-published-version.ts
    - src/app/_components/LogPublishedVersionForm.tsx
    - src/lib/edit-patterns.ts
  modified:
    - src/app/_components/DraftPanel.tsx
    - src/app/_components/HomeClient.tsx
    - src/app/page.tsx
decisions:
  - "Created edit-patterns.ts stub so Plan 03 is deployable before Plan 04 ships; dynamic import catches missing module non-fatally"
  - "accountId threaded as explicit prop (page.tsx → HomeClient → DraftPanel → LogPublishedVersionForm) rather than re-reading cookie inside the action, preventing misuse from non-request contexts"
  - "Stub functions use void parameters to satisfy strict TypeScript; Plan 04 replaces with real implementation"
metrics:
  duration: "~15 minutes"
  completed: "2026-05-12T16:32:05Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 3
---

# Phase 06 Plan 03: Edit Capture Flow Summary

**One-liner:** Server action and UI form that log the draft→published text pair into voice_corrections, update posts.selectionState, and fire async edit pattern extraction.

## What Was Built

### Task 1: logPublishedVersion server action (`src/app/actions/log-published-version.ts`)

The primary data-collection step for the learning engine. When Houtan submits the text he actually posted on LinkedIn:

1. Validates inputs: `postId` non-empty, `publishedText` 1–10,000 chars, `accountId` 1–3 whitelist
2. Guards with a SELECT — confirms post exists before any writes
3. Updates `posts`: `selectionState='published'`, `publishedText`, `status='published'`, `publishedAt`
4. Inserts a `voice_corrections` row with `id` (uuid), `accountId`, `postId`, `draftText`, `publishedText`
5. Fires `extractEditPatterns` non-blocking via `import("@/lib/edit-patterns").then(...)` — fails silently if module unavailable
6. Checks correction count threshold (>= 5) with a 7-day idempotency guard on `accounts.lastResynthAt` before triggering `resynthesizeVoiceAddendum` — updates `lastResynthAt` immediately before firing to prevent concurrent triggers
7. Calls `revalidatePath("/")` to refresh the draft list

### Task 2: LogPublishedVersionForm component (`src/app/_components/LogPublishedVersionForm.tsx`)

A collapsible client component rendered below each draft:

- Default state: "Log published version" link (no textarea visible — minimal UI footprint)
- Expanded state: textarea (`maxLength={10000}`) + "Save published version" / "Cancel" buttons
- Success state: green confirmation message "Published version logged. Learning engine will analyse the edits."
- Error handling: displays server error message in red, resets `submitting` state on failure

### Wiring: accountId threaded through component tree

`page.tsx` already fetched `accountId = await getActiveAccountId()`. Added `accountId` prop to:
- `HomeClient` (optional, defaults to `1`)
- `DraftPanel` (optional, defaults to `1`)
- `LogPublishedVersionForm` rendered inside `DraftPanel` below `TagRow`

### Stub: `src/lib/edit-patterns.ts`

Created a TypeScript-clean stub for `extractEditPatterns` and `resynthesizeVoiceAddendum` so Plan 03 is deployable independently. Plan 04 replaces this with the Haiku implementation. The dynamic import in the server action silently swallows module-not-found errors, so the stub is belt-and-suspenders.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript strict mode: `err` parameter typed as `unknown`**
- **Found during:** Task 1 tsc check
- **Issue:** Two `.catch((err) => ...)` callbacks in `log-published-version.ts` had implicit `any` type with `strict: true`
- **Fix:** Changed to `(err: unknown)` in both fire-and-forget catch handlers
- **Files modified:** `src/app/actions/log-published-version.ts`
- **Commit:** 5f8feb4

**2. [Rule 3 - Blocking] Missing `@/lib/edit-patterns` module caused tsc TS2307 errors**
- **Found during:** Task 2 tsc check
- **Issue:** `log-published-version.ts` dynamically imports `@/lib/edit-patterns` which is created in Plan 04. TypeScript resolves dynamic imports statically and emitted TS2307 (cannot find module).
- **Fix:** Created `src/lib/edit-patterns.ts` stub with correct function signatures and `void` parameter stubs — tsc exits 0. Plan 04 replaces with real implementation.
- **Files modified:** `src/lib/edit-patterns.ts` (created)
- **Commit:** 5f8feb4

**3. [Rule 2 - Missing wiring] page.tsx did not pass accountId to HomeClient**
- **Found during:** Task 2 wiring
- **Issue:** Plan notes "page.tsx wiring is done by Plan 06-02 which owns src/app/page.tsx" but 06-02 did not wire `accountId` into `HomeClient`. Without this, `LogPublishedVersionForm` would always use the default `accountId=1` regardless of active account.
- **Fix:** Added `accountId={accountId}` to `<HomeClient>` in `page.tsx`. `accountId` was already fetched via `getActiveAccountId()` on line 29.
- **Files modified:** `src/app/page.tsx`, `src/app/_components/HomeClient.tsx`, `src/app/_components/DraftPanel.tsx`
- **Commit:** 5f8feb4

## Threat Model Coverage

All three STRIDE threats from the plan are mitigated:

| Threat ID | Mitigation | Location |
|-----------|-----------|----------|
| T-06-05 | `publishedText.length > 10000` check; `.trim()` before storage; stored as plain text | `log-published-version.ts` L38-40 |
| T-06-06 | `!Number.isInteger(accountId) \|\| accountId < 1 \|\| accountId > 3` validation | `log-published-version.ts` L41-42 |
| T-06-07 | Guard SELECT confirms post exists before any writes | `log-published-version.ts` L45-52 |

## Commits

| Commit | Task | Description |
|--------|------|-------------|
| 2f09803 | Task 1 | feat(06-03): create logPublishedVersion server action |
| 5f8feb4 | Task 2 | feat(06-03): create LogPublishedVersionForm and wire accountId through component tree |

## Self-Check

- [x] `src/app/actions/log-published-version.ts` created
- [x] `src/app/_components/LogPublishedVersionForm.tsx` created
- [x] `src/lib/edit-patterns.ts` created (stub)
- [x] `npx tsc --noEmit` exits 0
- [x] Commits 2f09803 and 5f8feb4 exist
- [x] `LogPublishedVersionForm` wired into `DraftPanel` with `accountId` from page.tsx
