---
phase: 02-core-drafting
plan: 01
subsystem: database
tags: [seed, query-layer, topic-areas, drizzle-orm, turso]
dependency_graph:
  requires:
    - 01-02: DB schema (posts, topicAreas tables already in Turso)
    - 01-03: db singleton (src/db/client.ts)
  provides:
    - scripts/seed-topics.ts — idempotent seeder for all 7 topic areas
    - src/db/queries.ts — getDrafts() and getTopicAreas() query helpers
  affects:
    - 02-02+: all subsequent Phase 2 plans that need topic dropdown data or draft history
tech_stack:
  added: []
  patterns:
    - Drizzle onConflictDoNothing for idempotent seeding
    - db.select with explicit column projection for sidebar queries
    - Pick<Post, ...> return typing for partial selects
key_files:
  created:
    - scripts/seed-topics.ts
    - src/db/queries.ts
  modified:
    - package.json (seed-topics script added)
    - src/db/schema.ts (stub replaced with full Phase 1–5 schema)
decisions:
  - Used Pick<Post, ...> return type on getDrafts() to be explicit about projected columns
  - Included all 5 tag columns in getDrafts() so sidebar item click can pre-populate tags without a second query
  - schema.ts stub replaced with full schema in worktree so TypeScript compiles; this mirrors the main repo's schema exactly
metrics:
  duration: ~8 minutes
  completed: 2026-05-04T13:31:27Z
  tasks_completed: 2
  files_changed: 4
---

# Phase 2 Plan 01: Topic Area Seed + Query Helpers Summary

**One-liner:** Idempotent topic area seeder (7 rows, onConflictDoNothing) and shared Drizzle query helpers (getDrafts, getTopicAreas) consumed by all Phase 2 UI plans.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create topic area seed script | 3717599 | scripts/seed-topics.ts, package.json, src/db/schema.ts |
| 2 | Create shared DB query helpers | 781b9b1 | src/db/queries.ts |

## What Was Built

**scripts/seed-topics.ts** — Inserts all 7 topic area rows (id 1–7) into the `topic_areas` table. Uses `onConflictDoNothing()` for idempotency. Prints `✓ Topic areas seeded (7 rows, idempotent)` on success. Registered as `npm run seed-topics` in package.json.

**src/db/queries.ts** — Two exported async functions:
- `getDrafts()` — selects id, roughIdea, draftText, createdAt, hookType, narrativeStructure, topicId, scheduledTime, status from posts table, ordered by createdAt DESC
- `getTopicAreas()` — returns all rows from topicAreas table

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Schema stub replaced with full schema**
- **Found during:** Task 2 (TypeScript compile step)
- **Issue:** `src/db/schema.ts` in the worktree was a stub comment with no exported types. `src/db/queries.ts` imports `Post` and `TopicArea` from it — TypeScript would fail without the full schema.
- **Fix:** Replaced stub with the complete schema from the main repo (identical content, already deployed to Turso in Phase 1). No schema changes — purely restoring the file that the worktree's git history didn't include.
- **Files modified:** src/db/schema.ts
- **Commit:** 3717599

## Self-Check

### Created files exist
- [x] scripts/seed-topics.ts — exists
- [x] src/db/queries.ts — exists

### Commits exist
- [x] 3717599 — feat(02-01): seed 7 topic areas into topic_areas table
- [x] 781b9b1 — feat(02-01): create shared DB query helpers — getDrafts and getTopicAreas

### Verification results
- [x] `npm run seed-topics` exits 0 with "✓ Topic areas seeded (7 rows, idempotent)"
- [x] Second run also exits 0 (idempotent)
- [x] `grep -c "onConflictDoNothing" scripts/seed-topics.ts` = 1
- [x] `npx tsc --noEmit` exits 0 (no errors)
- [x] `grep -c "export async function getDrafts"` = 1
- [x] `grep -c "export async function getTopicAreas"` = 1

## Self-Check: PASSED
