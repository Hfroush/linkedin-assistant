---
phase: 02-core-drafting
plan: 04
subsystem: ui
tags: [react, nextjs, sidebar, history, click-to-load, client-state]
dependency_graph:
  requires:
    - "02-01: getDrafts() query helper"
    - "02-02: DraftPanel base component, page.tsx layout shell"
  provides:
    - "src/app/_components/HistorySidebar.tsx — scrollable past draft list with click handler"
    - "src/app/_components/HomeClient.tsx — client state bridge between sidebar and draft panel"
    - "src/app/page.tsx — server fetches drafts + topicAreas, passes to HomeClient"
  affects:
    - "src/app/_components/DraftPanel.tsx — loadedDraft prop + useEffect added"
    - "Phase 3: HomeClient layout anticipates discovery panel addition"
tech_stack:
  added: []
  patterns:
    - "Server Component fetches data → passes to Client Component wrapper (HomeClient)"
    - "Sibling client state via shared parent (HomeClient) rather than prop drilling through server boundary"
    - "useEffect watches prop change to populate form state (click-to-load pattern)"
key_files:
  created:
    - src/app/_components/HistorySidebar.tsx
    - src/app/_components/HomeClient.tsx
  modified:
    - src/app/page.tsx
    - src/app/_components/DraftPanel.tsx
decisions:
  - "HomeClient.tsx introduced as client boundary to share loadedDraft state between HistorySidebar and DraftPanel siblings — avoids prop-drilling through server component boundary"
  - "DraftSummary type exported from HistorySidebar.tsx as the shared contract between all three components"
  - "topicAreas prop added to DraftPanel in Plan 04 (anticipating Plan 03 TagRow integration at merge)"
metrics:
  duration: ~8 minutes
  completed: 2026-05-04T13:40:40Z
  tasks_completed: 2
  files_changed: 4
---

# Phase 2 Plan 04: Draft History Sidebar Summary

**One-liner:** Scrollable past-draft sidebar (first line + relative timestamp) wired into the home screen via a HomeClient state bridge, with click-to-load populating the draft panel from Turso data.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Build HistorySidebar component | f71e2f7 | src/app/_components/HistorySidebar.tsx |
| 2 | Wire sidebar into page.tsx and DraftPanel | 755afe7 | src/app/_components/HomeClient.tsx, src/app/page.tsx, src/app/_components/DraftPanel.tsx |

## What Was Built

**src/app/_components/HistorySidebar.tsx** — Client Component that renders a scrollable list of past drafts. Each item shows the first non-empty line of `draftText` (via `firstLine()` helper) and a human-readable relative timestamp (via `relativeTime()` helper — "just now", "N min ago", "Nh ago", "Nd ago", or localeDate). Empty state renders "No drafts yet. Generate your first post." Click on any item fires `onSelect(draft)` callback with the full `DraftSummary` object. Exports `DraftSummary` type for use by sibling components.

**src/app/_components/HomeClient.tsx** — Client Component that acts as the state bridge between `HistorySidebar` and `DraftPanel`. Holds `loadedDraft` state (`DraftSummary | null`). Receives `drafts` and `topicAreas` from the server page, renders the two-column grid layout. `setLoadedDraft` is passed as `onSelect` to HistorySidebar; `loadedDraft` is passed as a prop to DraftPanel.

**src/app/page.tsx** — Updated from a bare layout shell to a proper server data-fetching page. Calls `getDrafts()` and `getTopicAreas()` in parallel via `Promise.all`, passes results to `<HomeClient>`. Removes the old two-column grid (now owned by HomeClient).

**src/app/_components/DraftPanel.tsx** — Updated to accept `loadedDraft?: DraftSummary | null` and `topicAreas?: Array<{ id: number; name: string }>` props. A `useEffect` watches `loadedDraft` — when a non-null value arrives, it populates `draft`, `postId`, and `roughIdea` state (D-08). `topicAreas` prop added in anticipation of Plan 03's TagRow integration at merge.

## Requirements Satisfied

- **VOCE-05:** Past drafts visible in sidebar with first line of text + relative timestamp
- **D-06:** History sidebar is on the same screen as the drafting area (not a separate page)
- **D-07:** Each sidebar item shows first line of draft text + timestamp
- **D-08:** Clicking a sidebar item loads its draftText, roughIdea, and postId into the main draft area

## Deviations from Plan

None — plan executed exactly as written.

The plan specified a `HistorySidebarWrapper` approach initially, then corrected to `HomeClient` — implemented `HomeClient` directly as specified in the final approach.

## Known Stubs

None — all data flows from real Turso DB queries through `getDrafts()`.

## Self-Check

### Created files exist
- [x] src/app/_components/HistorySidebar.tsx — exists
- [x] src/app/_components/HomeClient.tsx — exists

### Modified files exist
- [x] src/app/page.tsx — updated
- [x] src/app/_components/DraftPanel.tsx — updated

### Commits exist
- [x] f71e2f7 — feat(02-04): build HistorySidebar component with first-line preview and relative timestamps
- [x] 755afe7 — feat(02-04): wire HistorySidebar into home screen with click-to-load behavior

### Acceptance criteria verified
- [x] `grep -c '"use client"' HistorySidebar.tsx` = 1
- [x] `grep -c "onSelect" HistorySidebar.tsx` = 3 (prop type + prop destructure + onClick usage)
- [x] `grep -c "firstLine" HistorySidebar.tsx` = 2 (definition + call)
- [x] `grep -c "relativeTime" HistorySidebar.tsx` = 2 (definition + call)
- [x] `grep -c "No drafts yet" HistorySidebar.tsx` = 1
- [x] `grep -c "getDrafts|getTopicAreas" page.tsx` = 3 (import + 2 in Promise.all)
- [x] `grep -c "HomeClient" page.tsx` = 2 (import + JSX render)
- [x] `grep -c "HistorySidebar" HomeClient.tsx` = 3 (import + type import + JSX)
- [x] `grep -c "loadedDraft" DraftPanel.tsx` = 7 (prop type, destructure, useEffect dep, 3 setState calls, JSX)
- [x] `grep -c "useEffect" DraftPanel.tsx` = 2 (import + call)
- [x] `grep -c '"use client"' HomeClient.tsx` = 1
- [x] HomeClient.tsx exists

## Self-Check: PASSED
