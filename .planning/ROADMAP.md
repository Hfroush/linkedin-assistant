# Roadmap: LinkedIn AI Content Assistant

## Overview

Five phases deliver the complete tool in dependency order. Phase 1 builds the database and voice engine — nothing else is buildable without it. Phase 2 ships the first usable product: draft a post in Houtan's voice, tag it across five dimensions, and copy it to clipboard. Phase 3 adds content discovery so the app surfaces what to write about. Phase 4 closes the performance loop with manual engagement tracking and a weekly digest. Phase 5 conditionally automates metrics pull via LinkedIn OAuth if the restricted scope is approved.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Database schema, DOCX parsing, voice profile stored and ready for injection *(Completed: 2026-05-04)*
- [x] **Phase 2: Core Drafting** - LLM drafting in Houtan's voice with 5-dimension tagging and clipboard publishing *(Completed: 2026-05-04)*
- [x] **Phase 3: Content Discovery** - RSS feed polling, topic prompt engine, inspiration feed, bookmarks *(Completed: 2026-05-05)*
- [ ] **Phase 4: Performance Tracking** - Manual engagement entry, per-post dashboard, tag analytics, weekly digest
- [ ] **Phase 5: Metrics Automation** - LinkedIn OAuth metrics pull (conditional on scope approval)

## Phase Details

### Phase 1: Foundation
**Goal**: The database is running and the voice profile is parsed, stored, and injectable — every downstream phase can build on it
**Depends on**: Nothing (first phase)
**Requirements**: VOCE-01, VOCE-02
**Success Criteria** (what must be TRUE):
  1. Running the setup process parses `Houtan Linkedin.docx` and stores the extracted plain text in the database without errors
  2. The stored voice profile text can be retrieved and injected as a system prompt prefix into an LLM call (verifiable via a local test or smoke-test script)
  3. The database schema supports all entities needed by subsequent phases: drafts, tags, posts, engagement records, feed items, bookmarks
**Plans**: 4 plans

Plans:
- [x] 01-PLAN-scaffold.md — Next.js 15.2 project scaffold, dependencies, Anthropic singleton, directory structure
- [x] 01-PLAN-database.md — Drizzle schema (6 tables, full multi-phase), Turso client, drizzle-kit config
- [x] 01-PLAN-voice-profile.md — DOCX parsing with mammoth, voice profile upsert and retrieval library
- [x] 01-PLAN-smoke-test.md — [BLOCKING] schema push to Turso + dual-call cache verification seed script

### Phase 2: Core Drafting
**Goal**: Houtan can turn a rough idea into a publish-ready LinkedIn post in his own voice, tag it across five dimensions, and copy it to clipboard — the core value of the product is usable
**Depends on**: Phase 1
**Requirements**: VOCE-03, VOCE-04, VOCE-05, TAGS-01, TAGS-02, TAGS-03, TAGS-04, TAGS-05, PUBL-01
**Success Criteria** (what must be TRUE):
  1. User types a rough idea, selects a post format (story arc, hot take, short insight, or essay), and receives a LinkedIn-ready draft that reads in Houtan's voice — not generic AI output
  2. Every draft is immediately taggable inline: hook type, narrative structure, topic area, and posting time are set during the draft flow without a separate step or modal
  3. Every generated draft is saved to draft history with its input prompt and timestamp — user can scroll back and revisit past drafts
  4. User can copy any finalised draft to clipboard with one click
**Plans**: 4 plans

Plans:
- [x] 02-01-PLAN.md — Seed 7 topic areas into Turso + getDrafts/getTopicAreas query helpers
- [x] 02-02-PLAN.md — Home page draft UI: textarea + format picker + generateDraft Server Action (cached Claude call + DB insert)
- [x] 02-03-PLAN.md — Inline tag row: 5 dropdowns + updateTags Server Action + clipboard copy (Wave 2)
- [x] 02-04-PLAN.md — Draft history sidebar: past drafts list + click-to-load into main draft area (Wave 2)

### Phase 3: Content Discovery
**Goal**: The app tells Houtan what to write about today and surfaces real-world articles and sources as inspiration — he never opens to a blank page
**Depends on**: Phase 2
**Requirements**: DISC-01, DISC-02, DISC-03, DISC-04, DISC-05
**Success Criteria** (what must be TRUE):
  1. The home screen shows a "what to write today" topic prompt drawn from the 7 topic areas and the 3x/week posting cadence (Mon/Wed/Fri)
  2. User can browse an inspiration feed of articles and sources filtered to the 7 topic areas, sourced from RSS, Google News RSS, and Substack/Ghost feeds
  3. User can click any discovery item and immediately start a draft pre-seeded with that article as context
  4. User can save any URL as a bookmark; saved bookmarks appear in the inspiration feed as draft prompts
**Plans**: 4 plans

Plans:
- [ ] 03-01-PLAN.md — Schema migration (uniqueIndex on contentHash, sourceUrl/sourceTitle on posts) + npm install rss-parser + src/lib/feeds.ts static config (Wave 1)
- [ ] 03-02-PLAN.md — poll-feeds.ts Server Action (DB-TTL RSS polling) + generate-angles.ts Server Action (Claude angle generation) + query helpers (Wave 2)
- [ ] 03-03-PLAN.md — TopicPromptCard.tsx + page.tsx topic prompt wiring + DraftPanel useSearchParams pre-fill + HomeClient Suspense boundary (Wave 3)
- [ ] 03-04-PLAN.md — NavBar.tsx + layout.tsx + /discover page + ArticleCard/ArticleFeed/BookmarkForm + save-bookmark Server Action (Wave 3, parallel with 03-03)

### Phase 4: Performance Tracking
**Goal**: Houtan can see how each post performed, understand which tag combinations work best, and receive a weekly digest — the feedback loop has observable signal
**Depends on**: Phase 3
**Requirements**: PERF-01, PERF-02, PERF-03, PERF-04, PERF-05, AUTO-02
**Success Criteria** (what must be TRUE):
  1. User can manually enter reactions, comments, reposts, and impressions for any published post; the app calculates and displays engagement rate automatically
  2. User can view a per-post dashboard showing each post's five tags and its engagement rate at a glance
  3. User can see performance broken down by tag dimension: best hook types, best narrative structures, top-performing topic areas, and optimal posting times
  4. The app generates a weekly digest identifying what performed above average, what underperformed, and which tag combinations are trending up
  5. The app displays a re-auth reminder before OAuth token expiry (60-day limit) so that future metrics automation does not silently break
**Plans**: 4 plans

Plans:
- [x] 04-01-PLAN.md — Query helpers (getPublishedPostsWithMetrics, getTagDimensionStats, getLatestDigest, getPublishedPostCount) + saveMetrics Server Action (Wave 1)
- [x] 04-02-PLAN.md — HistorySidebar metrics row: inline 4-input metrics entry + live engagement rate display (Wave 2)
- [x] 04-03-PLAN.md — generate-digest Server Action (Claude cached call) + WeeklyDigestCard + home page digest wiring (Wave 2)
- [ ] 04-04-PLAN.md — /stats route (aggregate summary cards + per-post table) + NavBar Stats link + ReauthBanner placeholder (Wave 3)

### Phase 5: Metrics Automation
**Goal**: If LinkedIn approves the `r_member_social` scope, engagement data is pulled automatically — manual entry becomes optional rather than required
**Depends on**: Phase 4
**Requirements**: AUTO-01
**Success Criteria** (what must be TRUE):
  1. If `r_member_social` scope is granted, the app automatically pulls reactions, comments, reposts, and impressions for published posts without any manual entry by Houtan
  2. Automatically pulled metrics populate the same per-post dashboard and tag analytics as manually entered metrics — the rest of the app is unaffected by which path delivered the data
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 4/4 | Complete | 2026-05-04 |
| 2. Core Drafting | 4/4 | Complete | 2026-05-04 |
| 3. Content Discovery | 4/4 | Complete | 2026-05-05 |
| 4. Performance Tracking | 4/4 | Complete | 2026-05-05 |
| 5. Metrics Automation | 0/TBD | Not started | - |
