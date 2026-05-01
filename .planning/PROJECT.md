# LinkedIn Assistant

## What This Is

A personal AI-powered LinkedIn content assistant for Houtan — a founder, educator, and institution-builder with seven distinct intellectual territories. It removes the friction of consistent posting by surfacing relevant trending content, prompting topic ideas, drafting posts in Houtan's voice, and learning over time what formats and topics actually land with his audience.

## Core Value

Turn a rough thought into a publish-ready LinkedIn post — in Houtan's voice, on any of his seven intellectual themes — without making him stare at a blank page.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Voice & Drafting**
- [ ] Parse `Houtan Linkedin.docx` to establish a voice profile used by all content generation
- [ ] Accept a rough idea or prompt and return a LinkedIn-ready draft in Houtan's voice
- [ ] Support multiple post formats: short hook + insight, storytelling arc, hot take, essay-style

**Topic Intelligence**
- [ ] Maintain the 7 core topic areas as persistent categories:
  1. Founder psychology (the interior life of building)
  2. Education as a design problem (impact validation vs. market traction)
  3. The archaeology of institutions (what institutions actually are)
  4. What AI actually changes in education (evidence-based, not hype)
  5. The founder-as-translator (converting uncertainty into direction)
  6. Scale and intimacy (why small rooms beat big stages)
  7. The gap between proof and belief (conviction / judgment / policy as the same cognitive move)
- [ ] Suggest what to write about when Houtan opens the app (topic prompt mode)
- [ ] Filter all suggestions and trending content to these 7 areas

**Trending Discovery**
- [ ] Scrape LinkedIn for relevant posts in the 7 topic areas
- [ ] Pull from RSS feeds and news sources aligned to those areas
- [ ] Surface a curated "trending now" feed as inspiration

**Performance Tracking & Learning**
- [ ] Track every published post with 5 tagged dimensions: hook type, narrative structure, topic (of 7), posting time, engagement rate (reactions + comments + reposts ÷ impressions)
- [ ] Pull engagement data from LinkedIn after publishing
- [ ] Bias future topic suggestions and draft style toward what performs well
- [ ] Generate a weekly performance digest: what worked, what didn't, why

**Publishing**
- [ ] v1: Generate draft → copy to clipboard / display for manual publishing
- [ ] v2: LinkedIn OAuth integration for scheduling and direct publishing

**Cadence System**
- [ ] Support a 3x/week posting cadence (Mon/Wed/Fri) with prompts/reminders

### Out of Scope

- Multi-user / SaaS product — this is a personal tool for Houtan only (no auth system, no billing)
- Generic LinkedIn optimization (profile rewrites, connection scripts, job search) — not the focus
- Writing about topics outside the 7 areas — the tool actively filters to these
- Vanity metric optimization (follower growth hacks, engagement pods) — feedback loop is for content quality, not gaming

## Context

- **Voice source**: `Houtan Linkedin.docx` in the project root — this document defines the writing style, intellectual register, and framing that all AI generation must match. It should be parsed and embedded as a system prompt / style guide.
- **Audience**: LinkedIn followers who are founders, educators, policymakers, and researchers — sophisticated readers who respond to specificity, not inspiration-speak.
- **Posting target**: 3x per week (Mon / Wed / Fri rhythm)
- **LinkedIn constraints**: LinkedIn's public API is limited; trending content will require scraping + RSS as primary sources. Engagement data pull (for feedback loop) requires LinkedIn OAuth.
- **Feedback loop architecture**: Every post gets tagged at creation time (hook type, narrative, topic, time). After publishing, engagement metrics are pulled and stored. The model learns which tag combinations outperform.

## Constraints

- **Personal only**: Single-user tool — no multi-tenancy, no user accounts
- **Voice fidelity**: All drafts must pass a "sounds like Houtan" bar — sophisticated, specific, not generic LinkedIn-speak
- **LinkedIn API limits**: Scraping + RSS for discovery; OAuth for publish/metrics; no assumption of full LinkedIn API access
- **Incremental publishing**: v1 ships without LinkedIn OAuth (draft only); publishing integration is v2

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Web app form factor | "Most efficient" — accessible anywhere, no install, easiest to ship | — Pending |
| DOCX as voice profile | Houtan's existing document captures voice better than style descriptions | — Pending |
| 7 fixed topic areas | Specificity over flexibility — the tool is opinionated about what Houtan writes about | — Pending |
| Engagement rate formula | (Reactions + comments + reposts) ÷ impressions — Houtan's definition | — Pending |
| v1 draft-only publishing | Ship faster; LinkedIn OAuth adds complexity; validate content quality first | — Pending |

---

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-01 after initialization*
