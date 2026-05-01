---
phase: 01-foundation
plan: 01
subsystem: infra
tags: [next.js, typescript, tailwind, anthropic-sdk, drizzle-orm, turso, libsql, mammoth, zod]

# Dependency graph
requires: []
provides:
  - Next.js 15.2 App Router project scaffolded with TypeScript and Tailwind CSS v4
  - All Phase 1 runtime dependencies installed (@anthropic-ai/sdk, drizzle-orm, @libsql/client, mammoth, zod)
  - Dev dependencies installed (drizzle-kit, tsx)
  - src/ directory structure matching AI-SPEC layout
  - Anthropic client singleton with fail-fast API key guard
  - Environment variable template (.env.local.example)
  - Directory stubs for Plans 02-04 (src/db/, src/lib/agents/, scripts/)
affects: [02-database, 03-voice-profile, 04-seed-script, all future plans]

# Tech tracking
tech-stack:
  added:
    - next@15.2.9
    - @anthropic-ai/sdk@^0.92.0
    - drizzle-orm@^0.45.2
    - @libsql/client@^0.17.3
    - mammoth@^1.12.0
    - zod@^4.4.1
    - drizzle-kit@^0.31.10
    - tsx@^4.21.0
    - tailwindcss@^4 (zero-config, no tailwind.config.js)
  patterns:
    - Module-level Anthropic singleton (create once per server process, reuse everywhere)
    - Fail-fast environment variable guard (throw on missing key at startup, not at call site)
    - Tailwind CSS v4 zero-config (@import "tailwindcss" only, no config file)
    - Next.js 15 App Router with Server Components as default

key-files:
  created:
    - src/lib/anthropic.ts — Anthropic client singleton, exported as `anthropic`
    - src/lib/voice-profile.ts — stub for Plan 03 implementation
    - src/db/schema.ts — stub for Plan 02 schema definition
    - src/db/client.ts — stub for Plan 02 Turso client
    - src/lib/agents/.gitkeep — placeholder for Phase 2+ agent files
    - scripts/.gitkeep — placeholder for seed script (Plan 04)
    - .env.local.example — documents ANTHROPIC_API_KEY, TURSO_DATABASE_URL, TURSO_AUTH_TOKEN
    - src/app/layout.tsx — root App Router layout with project metadata
    - src/app/page.tsx — placeholder home page
    - src/app/globals.css — Tailwind v4 import
    - package.json — all Phase 1 dependencies
  modified:
    - .gitignore — added *.docx (T-01-02), .planning/, !.env.local.example exception

key-decisions:
  - "Module-level Anthropic singleton: instantiated once per server process to avoid per-request client creation overhead"
  - "Fail-fast API key guard: throw at module load time with clear message rather than 401 deep in call stack"
  - "Tailwind v4 zero-config: no tailwind.config.js — CSS-only configuration via @theme blocks"
  - ".env.local.example whitelisted from gitignore: placeholder values only, safe to commit as documentation"
  - "*.docx added to .gitignore: Houtan Linkedin.docx contains personal writing that must never be committed"

patterns-established:
  - "Singleton pattern: src/lib/anthropic.ts — export a module-level const, not a function returning new instances"
  - "Fail-fast guards: check required env vars at module load, throw with actionable error message"
  - "Stub files: create module paths for future plans so imports resolve; clearly comment which plan implements them"

requirements-completed: [VOCE-01, VOCE-02]

# Metrics
duration: 7min
completed: 2026-05-01
---

# Phase 1 Plan 01: Scaffold Summary

**Next.js 15.2 App Router scaffolded with Anthropic SDK singleton, Tailwind CSS v4, Turso/Drizzle stubs, and full directory structure ready for Plans 02-04**

## Performance

- **Duration:** 7 min
- **Started:** 2026-05-01T12:29:45Z
- **Completed:** 2026-05-01T12:36:46Z
- **Tasks:** 2
- **Files modified:** 16

## Accomplishments

- Next.js 15.2 project scaffolded with TypeScript, Tailwind CSS v4 (zero-config), App Router, and src/ directory — all 6 runtime packages and 3 dev packages installed
- `src/lib/anthropic.ts` singleton with fail-fast `ANTHROPIC_API_KEY` guard (threat T-01-04 mitigated)
- `.gitignore` protecting both `.env*` (T-01-01) and `*.docx` (T-01-02); `.env.local.example` documenting all Phase 1 environment variables

## Task Commits

Each task was committed atomically:

1. **Task 1: Initialize Next.js 15.2 project and install all Phase 1 dependencies** - `fad2709` (feat)
2. **Task 2: Create directory structure, Anthropic singleton, and environment template** - `fd700cb` (feat)

**Plan metadata:** (committed after SUMMARY.md creation)

## Files Created/Modified

- `src/lib/anthropic.ts` — Anthropic client singleton with fail-fast env guard; exported as `anthropic`
- `src/lib/voice-profile.ts` — stub returning error until Plan 03 implements it
- `src/db/schema.ts` — empty stub; Plan 02 overwrites with Drizzle schema
- `src/db/client.ts` — empty stub; Plan 02 overwrites with Turso client
- `src/lib/agents/.gitkeep` — reserves directory for Phase 2+ agent files
- `scripts/.gitkeep` — reserves directory for seed script (Plan 04)
- `.env.local.example` — template with ANTHROPIC_API_KEY, TURSO_DATABASE_URL, TURSO_AUTH_TOKEN
- `src/app/layout.tsx` — root App Router layout (stripped of default Geist fonts)
- `src/app/page.tsx` — minimal placeholder ("LinkedIn Assistant / Phase 1: Foundation")
- `src/app/globals.css` — Tailwind v4 `@import "tailwindcss"` directive
- `package.json` — all runtime + dev dependencies for Phase 1
- `.gitignore` — added *.docx, .planning/, and !.env.local.example whitelist

## Decisions Made

- Used module-level Anthropic singleton (`export const anthropic = new Anthropic(...)`) — AI-SPEC explicitly warns against creating a new instance per request
- Added fail-fast guard on `ANTHROPIC_API_KEY` at module load: surfaces missing key immediately rather than at first API call
- Whitelisted `.env.local.example` in `.gitignore` (override of the `.env*` blanket rule) — the example file contains only placeholder values and is intentionally safe to commit as developer documentation
- `*.docx` added to `.gitignore` as an explicit security requirement — `Houtan Linkedin.docx` contains personal writing samples and must never be committed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Whitelisted .env.local.example from .gitignore**
- **Found during:** Task 2 (environment template creation)
- **Issue:** The scaffolded `.gitignore` included `.env*` which would have blocked `.env.local.example` from being committed. The plan requires this file to exist in version control as developer documentation.
- **Fix:** Added `!.env.local.example` exception after the `.env*` rule in `.gitignore`
- **Files modified:** `.gitignore`
- **Verification:** `git add .env.local.example` succeeded without using `-f`
- **Committed in:** fd700cb (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 - missing critical)
**Impact on plan:** The fix was necessary for correctness — without it, `.env.local.example` would be silently excluded from version control. No scope creep.

## Known Stubs

The following stubs are intentional scaffolding for future plans:

| File | Stub type | Reason | Resolved by |
|------|-----------|--------|-------------|
| `src/lib/voice-profile.ts` | Throws error | Voice profile retrieval requires DB (Plan 02) and DOCX parsing (Plan 03) | Plan 03 |
| `src/db/schema.ts` | Empty module | Full schema defined in Plan 02 | Plan 02 |
| `src/db/client.ts` | Empty module | Turso client requires TURSO_DATABASE_URL (Plan 02) | Plan 02 |

These stubs do not prevent this plan's goal from being achieved — the scaffold plan's purpose is to establish the directory structure and module paths, not to implement the DB or voice profile.

## Issues Encountered

`create-next-app@15.2` rejected the project directory name "Linkedin Claude Project" (spaces and capital letters violate npm naming rules). Workaround: scaffolded into a temporary `linkedin-assistant/` subdirectory, then rsync'd to the project root. The `package.json` name field was set to `"linkedin-assistant"` by the scaffolder — this is the npm package name (only used for internal references) and does not need to match the directory name.

## User Setup Required

Before running the app or any plan, copy `.env.local.example` to `.env.local` and fill in:

```bash
cp .env.local.example .env.local
# Then edit .env.local:
# ANTHROPIC_API_KEY — from https://console.anthropic.com/settings/keys
# TURSO_DATABASE_URL — from https://turso.tech/app (libSQL URL)
# TURSO_AUTH_TOKEN — from Turso dashboard
```

## Next Phase Readiness

- Next.js project is runnable: `npm run dev` starts the app without errors
- All Phase 1 dependencies installed and resolvable
- Directory structure ready for Plans 02 (database), 03 (voice profile), 04 (seed script)
- `src/lib/anthropic.ts` is the canonical import for all LLM calls in all future plans
- No blockers — Plan 02 can begin immediately

## Self-Check: PASSED

All created files verified on disk. Both task commits verified in git log.

| Check | Result |
|-------|--------|
| src/lib/anthropic.ts | FOUND |
| src/lib/voice-profile.ts | FOUND |
| src/db/schema.ts | FOUND |
| src/db/client.ts | FOUND |
| .env.local.example | FOUND |
| src/app/layout.tsx | FOUND |
| package.json | FOUND |
| commit fad2709 | FOUND |
| commit fd700cb | FOUND |

---
*Phase: 01-foundation*
*Completed: 2026-05-01*
