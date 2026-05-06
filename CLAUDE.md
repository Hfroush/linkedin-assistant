# LinkedIn Assistant — Project Guide

## Project

A personal AI-powered LinkedIn content assistant for Houtan. Turns rough ideas into publish-ready posts in his voice, surfaces trending content across 7 intellectual topic areas, tracks post performance, and learns what formats and topics land with his audience.

**Core value:** Turn a rough thought into a publish-ready LinkedIn post — in Houtan's voice, on any of his seven intellectual themes — without making him stare at a blank page.

**Planning docs:** `.planning/` (gitignored — local only)

## Stack

- **Framework:** Next.js 15.2 (App Router, Server Components, Server Actions)
- **Styling:** Tailwind CSS v4
- **AI:** Anthropic SDK 0.92.x — use directly, not via Vercel AI SDK; use prompt caching for voice profile
- **Database:** Neon Postgres + Drizzle ORM
- **DOCX parsing:** mammoth
- **RSS:** rss-parser
- **Auth:** next-auth v5 (LinkedIn OAuth — Phase 4+)

## GSD Workflow

This project uses the Get Shit Done (GSD) planning framework.

### Commands
- `/gsd-discuss-phase <N>` — gather context and clarify approach for a phase
- `/gsd-plan-phase <N>` — create execution plan for a phase
- `/gsd-execute-phase <N>` — execute all plans in a phase
- `/gsd-progress` — check current status

### Current State
See `.planning/STATE.md` for current position and context.
See `.planning/ROADMAP.md` for all 5 phases and their requirements.
See `.planning/REQUIREMENTS.md` for the full v1 requirement list.

### Rules
- Work phase by phase in order (1 → 2 → 3 → 4 → 5)
- Do not skip phases or implement v2 features during v1 phases
- Commit planning docs are gitignored — do not attempt to stage `.planning/`
- LinkedIn `r_member_social` scope: apply for it early; design manual metrics entry as the primary path

## Key Decisions

- Voice profile comes from `Houtan Linkedin.docx` — parse once, store in DB, inject as cached system prompt
- This is a single-user personal tool. Production deployments must be protected by Basic Auth, Vercel deployment protection, Cloudflare Access, or an equivalent access gate.
- LinkedIn scraping is out of scope (ToS risk) — RSS + Google News + Substack are the discovery sources
- Engagement rate = (reactions + comments + reposts) ÷ impressions
- Post tagging must be inline during the draft flow — not a separate step

## 7 Topic Areas

1. Founder psychology — the interior life of building
2. Education as a design problem — impact validation vs. market traction
3. The archaeology of institutions — what institutions actually are
4. What AI actually changes in education — evidence-based, not hype
5. The founder-as-translator — converting uncertainty into direction
6. Scale and intimacy — why small rooms beat big stages
7. The gap between proof and belief — conviction / judgment / policy as the same cognitive move
