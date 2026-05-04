# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-01)

**Core value:** Turn a rough thought into a publish-ready LinkedIn post — in Houtan's voice, on any of his seven intellectual themes — without making him stare at a blank page.
**Current focus:** Phase 2 — Core Drafting

## Current Position

Phase: 2 of 5 (Core Drafting)
Plan: 0 of 4 in current phase
Status: Ready to execute
Last activity: 2026-05-04 — Phase 2 planned (4 plans, 2 waves)

Progress: [██░░░░░░░░] 20%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Research confirmed: manual metrics entry is the primary path for engagement data — LinkedIn `r_member_social` is restricted and not guaranteed
- Research confirmed: RSS feeds (not LinkedIn scraping) are the primary discovery source — scraping violates ToS
- Research confirmed: voice profile DOCX must use Anthropic prompt caching — raw injection on every call is too expensive
- Research confirmed: tagging must be inline in the draft flow — a separate step will be skipped
- Stack confirmed: Next.js 15.2, Tailwind CSS v4, Anthropic SDK 0.92.x, Turso + Drizzle ORM, mammoth for DOCX, rss-parser

### Pending Todos

None yet.

### Blockers/Concerns

- LinkedIn `r_member_social` scope approval is externally controlled and timeline is unknown — apply during Phase 1 setup to start the clock; Phase 5 is conditional on approval
- Hook type and narrative structure controlled vocabulary must be defined before Phase 2 ships — dropdown values needed before tagging UI is built
- RSS feed curation for niche topic areas ("archaeology of institutions", "gap between proof and belief") is a Phase 3 task requiring manual research

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| v2 | LinkedIn OAuth for direct publishing (PUB2-01, PUB2-02, PUB2-03) | Out of scope | Initialization |
| v2 | Feedback loop / learning engine (FEED-01, FEED-02, FEED-03) | Out of scope | Initialization |
| v2 | LinkedIn scraping as supplementary discovery (SCRP-01) | Out of scope | Initialization |

## Session Continuity

Last session: 2026-05-01
Stopped at: Phase 1 complete — ready to discuss/plan Phase 2 (Core Drafting)
Resume file: None
