---
phase: 05-metrics-automation
plan: "01"
subsystem: metrics-automation
tags: [apify, server-action, tdd, metrics, drizzle]
dependency_graph:
  requires: []
  provides: [pullMetrics-server-action, apify-singleton, getDrafts-linkedinPostUrl]
  affects: [src/db/queries.ts, src/app/actions/pull-metrics.ts, src/lib/apify.ts]
tech_stack:
  added: [apify-client@2.23.1]
  patterns: [discriminated-union-result, server-action-guard, non-destructive-db-write]
key_files:
  created:
    - src/lib/apify.ts
    - src/app/actions/pull-metrics.ts
    - src/lib/pull-metrics.test.ts
  modified:
    - src/db/queries.ts
    - package.json
    - package-lock.json
decisions:
  - "pullLinkedInPostMetrics returns discriminated union { ok, reason } instead of null to distinguish timeout vs no_data for precise error propagation in the action"
  - "impressions column is never written by pullMetrics — manual-entry only; only read to recalculate engagementRate"
  - "engagementRate is conditionally added to updatePayload only when non-null — not included when impressions is null"
metrics:
  duration: "~8 minutes"
  completed: "2026-05-06T16:03:33Z"
  tasks_completed: 2
  files_changed: 6
---

# Phase 5 Plan 01: Apify Backend for Metrics Automation Summary

**One-liner:** Apify-client singleton + pullMetrics Server Action with non-destructive DB write guards, engagementRate recalculation, and 5 passing unit tests (TDD).

## What Was Built

- **`src/lib/apify.ts`** — ApifyClient singleton (server-side only, APIFY_API_KEY never exposed to client). `pullLinkedInPostMetrics()` returns a discriminated union distinguishing timeout from empty-items (no_data).

- **`src/app/actions/pull-metrics.ts`** — Server Action with `maxDuration = 60`. Four guards: `not_found`, `no_url`, `no_data`, `timeout`. Never writes `impressions` (manual-entry only). Conditionally recalculates `engagementRate` only when `impressions` is non-null/non-zero.

- **`src/db/queries.ts`** — `getDrafts` extended with `linkedinPostUrl` and `metricsPulledAt` in both `DraftRow` type and select object. Required by Plan 02 UI.

- **`src/lib/pull-metrics.test.ts`** — 5 unit tests covering all AUTO-01 behaviors, using `vi.hoisted` mock pattern for Vitest compatibility.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install apify-client, write failing tests (RED) | 6146256 | package.json, src/lib/pull-metrics.test.ts |
| 2 | Implement apify.ts, pull-metrics.ts, extend getDrafts (GREEN) | 100c776, a028032, f6deb51 | src/lib/apify.ts, src/app/actions/pull-metrics.ts, src/db/queries.ts |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Redesigned pullLinkedInPostMetrics return type to discriminated union**
- **Found during:** Task 2 implementation
- **Issue:** Original plan spec had `pullLinkedInPostMetrics` return `ApifyLinkedInStats | null` for both timeout and no_data cases. The action could not distinguish between them — Test 3 required `no_data` when Apify items is empty, but a `null` return from both would map to the same `timeout` error code.
- **Fix:** Changed return type to `ApifyResult = { ok: true, stats } | { ok: false, reason: "timeout" | "no_data" }`. Action uses `result.reason` directly for precise error propagation.
- **Files modified:** src/lib/apify.ts, src/app/actions/pull-metrics.ts
- **Commits:** 100c776, a028032

**2. [Rule 1 - Bug] Fixed vi.mock hoisting error in test file**
- **Found during:** Task 1 RED run after Task 2 implementation
- **Issue:** Test file referenced top-level `const` variables (`mockSelect`, etc.) inside `vi.mock()` factory functions. Vitest hoists `vi.mock()` to the top of the file, so the variables were not yet initialized when the factory ran — causing `ReferenceError: Cannot access 'mockSelect' before initialization`.
- **Fix:** Moved all mock function declarations into `vi.hoisted(() => { ... })` so they are available when `vi.mock` factories execute.
- **Files modified:** src/lib/pull-metrics.test.ts
- **Commit:** f6deb51

## Verification Results

1. Unit tests: 5/5 passing
2. TypeScript build: clean (no errors)
3. File existence: all three files present
4. Server guard: `"use server"` confirmed in pull-metrics.ts
5. Timeout export: `maxDuration = 60` confirmed
6. Non-destructive: `impressions` not in `updatePayload` — only in SELECT and `calculateEngagementRate` call
7. getDrafts: `linkedinPostUrl` appears twice in queries.ts (type + select)

## Threat Model Compliance

All mitigations from the plan's threat register are implemented:

| Threat ID | Mitigation | Status |
|-----------|-----------|--------|
| T-05-01 | DB query guards `status = 'published' AND id = postId` | Implemented in pullMetrics |
| T-05-02 | `"use server"` on pull-metrics.ts; APIFY_API_KEY server-scoped | Implemented |
| T-05-03 | Type guard on `item.stats` before DB write; empty items returns no_data | Implemented in apify.ts |
| T-05-04 | Single-user tool — accepted risk | Accepted |

## Known Stubs

None — no placeholder values or TODOs in the implementation.

## Self-Check: PASSED

- `src/lib/apify.ts` — FOUND
- `src/app/actions/pull-metrics.ts` — FOUND
- `src/lib/pull-metrics.test.ts` — FOUND
- Commit `6146256` — FOUND (test RED)
- Commit `100c776` — FOUND (apify.ts)
- Commit `a028032` — FOUND (pull-metrics.ts)
- Commit `f6deb51` — FOUND (getDrafts + test GREEN)
