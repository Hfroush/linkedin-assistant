---
phase: 01-foundation
plan: 04
subsystem: infra
tags: [anthropic-sdk, mammoth, drizzle-kit, turso, prompt-caching, smoke-test]

# Dependency graph
requires:
  - phase: 01-01
    provides: Anthropic SDK installed, scripts/ directory
  - phase: 01-02
    provides: drizzle.config.ts, Turso schema push capability
  - phase: 01-03
    provides: upsertVoiceProfile(), getVoiceProfile()
provides:
  - scripts/seed.ts — runnable smoke test verifying full Phase 1 plumbing
  - Turso schema pushed (all 6 tables live in the database)
  - Prompt caching verified end-to-end (cache_read_input_tokens > 0 on 2nd call)
affects: [Phase 2 — LLM call pattern established here is the template for drafting]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Dual-call cache verification — two back-to-back calls with same system array prove cache round-trip
    - System prompt as array with cache_control ephemeral on voice profile block (not string form)
    - Shell env loading pattern — sh -c 'set -a && . .env.local' for tsx scripts outside Next.js
    - Drizzle-kit push via shell-sourced env (npx drizzle-kit push with pre-exported vars)

key-files:
  created:
    - scripts/seed.ts — Phase 1 smoke test; upsertVoiceProfile → getVoiceProfile → two Claude calls
  modified:
    - package.json — seed script uses sh -c env-loading pattern

key-decisions:
  - "Hardcoded test prompt referencing founder psychology (D-03) — repeatable, easy to judge"
  - "Prints draft output to terminal for manual voice fidelity judgment (D-02)"
  - "Shell env-sourcing pattern for npm scripts that use tsx outside Next.js"

patterns-established:
  - "system: array form with cache_control — NEVER string form for cached prompts"
  - "Two-call smoke test pattern — proves cache creation AND cache read in one run"

requirements-completed:
  - VOCE-01
  - VOCE-02

# Metrics
duration: 15min
completed: 2026-05-04
---

# Phase 1-04: Smoke Test Summary

**End-to-end Phase 1 verified: DOCX parsed (16,481 chars), stored in Turso, cache HIT confirmed on 2nd Claude call, draft output sounds like Houtan**

## Performance

- **Duration:** 15 min
- **Completed:** 2026-05-04
- **Tasks:** 3/3 (including human verification gate)
- **Files modified:** 2

## Accomplishments
- Turso schema pushed — all 6 tables live (`voice_profile`, `topic_areas`, `posts`, `trending_items`, `performance_bias`, `weekly_digests`)
- `scripts/seed.ts` created and passes: upsertVoiceProfile → getVoiceProfile → two Claude API calls
- Cache verified: `cache_creation_input_tokens: 3882` on call 1, `cache_read_input_tokens: 3882` on call 2
- Draft output approved by Houtan as voice-faithful
- `npm run seed` works standalone via shell env-sourcing pattern

## Task Commits

1. **Task 1: Schema push** — executed via `npx drizzle-kit push` (no code commit, DB-side only)
2. **Task 2: Seed script** — `501b60d` (feat)
3. **Fix: env loading** — `bba9846` (fix — tsx import hoisting required shell-level env sourcing)

## Files Created/Modified
- `scripts/seed.ts` — Phase 1 smoke test script
- `package.json` — seed script command with shell env-loading

## Decisions Made
- Shell `set -a && . .env.local` pattern in npm script — tsx static imports are hoisted before runtime code, so env vars must be set before the process starts
- Kept seed script simple — no dotenv dependency, env loaded by the shell wrapper

## Deviations from Plan
- `--env-file=.env.local` tsx flag does not work (flag is Node-level, not tsx-level) — replaced with shell sourcing pattern. Same outcome, cleaner than adding a dotenv dependency.

## Issues Encountered
- tsx `--env-file` flag not forwarded to Node process — env vars not visible to statically-hoisted imports. Fixed by sourcing `.env.local` in the shell before tsx runs.

## Next Phase Readiness
- Phase 2 drafting service should use the same system array pattern: `[{ type: "text", text: voiceProfile, cache_control: { type: "ephemeral" } }, ...]`
- `getVoiceProfile()` is the canonical import for all LLM calls — do not inline DB queries
- Voice profile is 16,481 chars (~3,882 tokens) — well above the 1,024-token minimum for caching

---
*Phase: 01-foundation*
*Completed: 2026-05-04*
