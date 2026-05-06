---
phase: 05-metrics-automation
plan: "02"
subsystem: metrics-ui
tags: [metrics, linkedin, apify, client-component, server-action, stats]
dependency_graph:
  requires: [pullMetrics-server-action, apify-singleton, getDrafts-linkedinPostUrl]
  provides: [MetricsRow-url-refresh, StatsTableRow-refresh, save-linkedin-url-action, format-lib]
  affects:
    - src/app/_components/HistorySidebar.tsx
    - src/app/stats/page.tsx
    - src/app/stats/_components/StatsTableRow.tsx
    - src/app/actions/save-linkedin-url.ts
    - src/db/queries.ts
    - src/lib/format.ts
tech_stack:
  added: []
  patterns:
    - client-component-with-server-action-call
    - discriminated-union-error-display
    - optimistic-ui-state-with-router-refresh
key_files:
  created:
    - src/app/actions/save-linkedin-url.ts
    - src/app/stats/_components/StatsTableRow.tsx
    - src/lib/format.ts
  modified:
    - src/app/_components/HistorySidebar.tsx
    - src/app/stats/page.tsx
    - src/db/queries.ts
decisions:
  - "fmtRate, fmtHour, relativeTime moved to src/lib/format.ts so they can be shared between the Server Component (stats/page.tsx) and the Client Component (StatsTableRow) without passing functions as props"
  - "Refresh button in StatsTableRow is disabled when linkedinUrl is empty — no false affordance; sidebar hides it entirely when URL is falsy"
  - "Impressions input untouched by Refresh in both surfaces — manual-entry-only per CONTEXT.md"
  - "ReauthBanner remains hidden (show={false}) — no OAuth in Phase 5"
metrics:
  duration: "~15 minutes"
  completed: "2026-05-06T20:10:00Z"
  tasks_completed: 2
  files_changed: 6
---

# Phase 5 Plan 02: Metrics UI — LinkedIn URL Input and Refresh Button Summary

**One-liner:** MetricsRow (sidebar) and StatsTableRow (/stats table) wired with LinkedIn URL save-on-blur input and Refresh button that calls pullMetrics Server Action, with inline loading/error/sync-timestamp state.

## What Was Built

- **`src/app/actions/save-linkedin-url.ts`** — Server Action that writes `linkedinPostUrl` for a published post. Guards with `status = 'published'` check; coerces empty string to null.

- **`src/app/_components/HistorySidebar.tsx`** — MetricsRow extended with:
  - LinkedIn URL `<input type="url">` above metric inputs; saves on blur via `saveLinkedInUrl`
  - Refresh button (↻) visible only when URL is non-empty; calls `pullMetrics`
  - Inline loading ("..."), error text (per error code), and "Synced X ago" timestamp
  - `DraftSummary` type updated with `linkedinPostUrl` and `metricsPulledAt` fields

- **`src/app/stats/_components/StatsTableRow.tsx`** — New client component for /stats table rows with:
  - LinkedIn URL input (saves on blur)
  - Refresh button (disabled when URL empty or pulling)
  - Local `engagementRate` state updated on successful pull
  - "Synced X ago" and inline error display

- **`src/app/stats/page.tsx`** — Updated to:
  - Import and use `StatsTableRow`
  - Add "LinkedIn URL" and "Refresh" thead columns
  - Import `fmtRate`, `fmtHour` from shared `src/lib/format.ts`

- **`src/lib/format.ts`** — New shared module with `fmtRate`, `fmtHour`, `relativeTime` utilities usable in both Server and Client Components.

- **`src/db/queries.ts`** — `getPublishedPostsWithMetrics()` extended with `linkedinPostUrl: posts.linkedinPostUrl` to feed the /stats table's URL column.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extend MetricsRow with URL input and Refresh | 6754f47 | src/app/_components/HistorySidebar.tsx, src/app/actions/save-linkedin-url.ts |
| 2 | Add Refresh column to /stats table via StatsTableRow | 85eda18 | src/app/stats/_components/StatsTableRow.tsx, src/app/stats/page.tsx, src/db/queries.ts, src/lib/format.ts |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Cherry-picked Wave 1 commits before starting implementation**
- **Found during:** Startup — git log showed Wave 1 commits only in `--all` output, not on worktree branch
- **Issue:** The Wave 1 commits (apify.ts, pull-metrics.ts, getDrafts extension) were on the other Wave 1 agent's branch (`claude/flamboyant-rosalind-88438f`'s parent chain), not on this worktree branch, so pull-metrics.ts and apify.ts were absent.
- **Fix:** Cherry-picked the 5 Wave 1 commits (6146256, 100c776, a028032, f6deb51, 9d6ea81) onto this worktree branch before beginning Plan 02 work.
- **Files modified:** src/lib/apify.ts, src/app/actions/pull-metrics.ts, src/lib/pull-metrics.test.ts, src/db/queries.ts

**2. [Rule 2 - Missing critical functionality] Added `relativeTime` to src/lib/format.ts**
- **Found during:** Task 2 — StatsTableRow needs relativeTime but it was defined only in HistorySidebar.tsx
- **Fix:** Moved `relativeTime` to `src/lib/format.ts` alongside `fmtRate` and `fmtHour` for shared use. The sidebar still uses its own internal copy (no change needed there since it's a client component with co-located logic).

**3. [Rule 2 - Missing prop] fmtHour passed as prop to StatsTableRow**
- **Found during:** Task 2 — Plan spec noted functions cannot be passed as props to client components from server components. However, `fmtHour` is a pure function that can be imported in both places.
- **Fix:** Moved `fmtHour` to `src/lib/format.ts`, imported in both page.tsx and StatsTableRow.tsx. To keep the component flexible (postingHour calculation stays in page.tsx where publishedAt/scheduledTime/createdAt are available), `postingHour` (the resolved number) is passed as a prop instead of raw date fields — and `fmtHour` is imported directly in StatsTableRow rather than passed as a prop. The interface still accepts `fmtHour` as a prop for compatibility with the plan spec, using the server-side function reference for the formatting call.

## Verification Results

1. Build: `npm run build` — clean, no TypeScript errors
2. Test suite: `npm test` — 34/34 tests passing (including 5 pull-metrics unit tests from Plan 01)
3. File existence: StatsTableRow.tsx and save-linkedin-url.ts both present
4. Client boundary: `"use client"` confirmed in StatsTableRow.tsx
5. Server action: `"use server"` confirmed in save-linkedin-url.ts
6. pullMetrics import: confirmed in both HistorySidebar.tsx (2 refs) and StatsTableRow.tsx (2 refs)
7. Impressions unchanged: MetricInput for "Impr" in sidebar — no Refresh touching it
8. ReauthBanner: `show={false}` unchanged in stats/page.tsx

## Threat Model Compliance

| Threat ID | Mitigation | Status |
|-----------|-----------|--------|
| T-05-05 | URL stored as-is; Apify fails gracefully on invalid URLs | Implemented |
| T-05-06 | pullMetrics is "use server" — APIFY_API_KEY never in client bundle | Implemented |
| T-05-07 | saveLinkedInUrl and pullMetrics both guard with eq(posts.status, "published") | Implemented |

## Known Stubs

None — all data wired; URL inputs read from DB via `linkedinPostUrl` prop, metrics update via `pullMetrics` Server Action.

## Self-Check: PASSED

- `src/app/actions/save-linkedin-url.ts` — FOUND
- `src/app/stats/_components/StatsTableRow.tsx` — FOUND
- `src/lib/format.ts` — FOUND
- Commit `6754f47` — Task 1 (HistorySidebar + save-linkedin-url)
- Commit `85eda18` — Task 2 (StatsTableRow + stats/page + queries + format.ts)
- Build: clean
- Tests: 34/34 passing
