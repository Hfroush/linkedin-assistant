---
phase: 06-multi-account-learning-engine
plan: "02"
subsystem: account-switcher-ui
tags: [accounts, cookie, server-action, client-component, voice-profile, navbar, queries]
dependency_graph:
  requires: [06-01-schema, accounts-table, voiceProfile-accountId-column, posts-accountId-column]
  provides: [AccountSwitcher-component, switchAccount-server-action, getActiveAccountId, getActiveAccountSlug, getVoiceProfileForAccount, getDrafts-accountId-scoped]
  affects:
    - src/lib/account.ts
    - src/app/actions/switch-account.ts
    - src/app/_components/AccountSwitcher.tsx
    - src/app/_components/NavBar.tsx
    - src/app/layout.tsx
    - src/lib/voice-profile.ts
    - src/app/actions/generate-draft.ts
    - src/db/queries.ts
    - src/app/page.tsx
tech_stack:
  added: []
  patterns:
    - cookie-based-account-context
    - whitelist-validated-cookie-input
    - server-component-reads-cookie-passes-to-client
    - multi-block-cached-system-prompt
    - lazy-abandoned-draft-detection
key_files:
  created:
    - src/lib/account.ts
    - src/app/actions/switch-account.ts
    - src/app/_components/AccountSwitcher.tsx
  modified:
    - src/app/_components/NavBar.tsx
    - src/app/layout.tsx
    - src/lib/voice-profile.ts
    - src/app/actions/generate-draft.ts
    - src/db/queries.ts
    - src/app/page.tsx
decisions:
  - "x-active-account cookie set with httpOnly=false so client can read it for optimistic UI; maxAge=1 year for persistence across browser sessions"
  - "Whitelist validation in both getActiveAccountId (server-side read) and switchAccount (action input) — two independent tamper guards"
  - "getVoiceProfileForAccount falls back to personal profile (id=1) when no account-specific voice profile row exists — UCL/Startup accounts inherit personal voice until their DOCX is provided"
  - "voiceAddendum injected as Block 2 in system prompt only when > 50 chars — avoids empty block penalty; non-fatal if below Anthropic 2048-token cache threshold"
  - "Lazy abandoned detection in getDrafts: drafts older than 7 days with null selectionState and status=draft are silently marked abandoned before the SELECT"
  - "NavBar stays 'use client' (needs usePathname for active link highlight) — layout.tsx reads cookie server-side and passes activeSlug as prop"
metrics:
  duration: "~20 minutes"
  completed: "2026-05-12T16:28:00Z"
  tasks_completed: 2
  files_changed: 9
---

# Phase 6 Plan 02: Account Switcher UI and Account-Scoped Data Summary

**One-liner:** Cookie-based account switcher (x-active-account) in the NavBar with whitelist-validated server action, per-account voice profile lookup with personal fallback, account-scoped draft history, and account-aware LLM generation with voice addendum as Block 2 in the system prompt.

## What Was Built

- **`src/lib/account.ts`** — Pure utility module (no "use server"): `getActiveAccountId()`, `getActiveAccountSlug()`, `ACCOUNT_ID_MAP`, `ACCOUNT_SLUG_MAP`, `ACCOUNT_SLUGS`, `ACCOUNT_DISPLAY_NAMES`, `AccountSlug` type. Whitelist validates cookie against `["personal", "ucl", "startup"]`; defaults to personal.

- **`src/app/actions/switch-account.ts`** — Server Action that sets the `x-active-account` cookie with 1-year maxAge, sameSite=lax, httpOnly=false. Whitelist guard silently rejects invalid slugs. Client calls `router.refresh()` after action returns.

- **`src/app/_components/AccountSwitcher.tsx`** — Client component `<select>` dropdown. Receives `activeSlug: AccountSlug` prop. Calls `switchAccount(slug)` then `router.refresh()` on change. Shows disabled state during switch.

- **`src/app/_components/NavBar.tsx`** — Updated to accept `{ activeSlug: AccountSlug }` prop. Renders `<AccountSwitcher activeSlug={activeSlug} />` at right of nav bar via `ml-auto` wrapper.

- **`src/app/layout.tsx`** — Made `async`. Calls `await getActiveAccountSlug()` server-side, passes result as prop to `<NavBar activeSlug={activeSlug} />`.

- **`src/lib/voice-profile.ts`** — Added `getVoiceProfileForAccount(accountId: number)`: queries `voiceProfile` table for `accountId` match; falls back to `getVoiceProfile()` (id=1) if no row found.

- **`src/app/actions/generate-draft.ts`** — Account-aware generation:
  - `callClaude` signature extended: `(voiceProfileText, voiceAddendum: string | null, systemInstruction, userMessage)`
  - Builds `systemBlocks` array: Block 1 = base voice profile (cached), Block 2 = addendum (cached, only if > 50 chars), Block 3 = system instruction
  - `generateDraft` calls `getActiveAccountId()`, `getVoiceProfileForAccount(accountId)`, fetches `accounts.voiceProfileAddendum`
  - All 3 `callClaude` invocations updated with `voiceAddendum` argument
  - `db.insert(posts)` now includes `accountId`

- **`src/db/queries.ts`** — `getDrafts(accountId: number)`: adds lazy abandoned detection (UPDATE drafts older than 7 days with no selectionState to "abandoned"), then SELECTs with `WHERE posts.account_id = accountId`. Added `lt` to drizzle-orm imports.

- **`src/app/page.tsx`** — Calls `getActiveAccountId()` and passes result to `getDrafts(accountId)`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create account utilities, switchAccount action, AccountSwitcher component | 7c0dfc0 | src/lib/account.ts, src/app/actions/switch-account.ts, src/app/_components/AccountSwitcher.tsx |
| 2 | Wire AccountSwitcher into NavBar/layout; scope queries and generateDraft | 96b7437 | NavBar.tsx, layout.tsx, voice-profile.ts, generate-draft.ts, queries.ts, page.tsx |

## Deviations from Plan

None — plan executed exactly as written.

## Threat Model Compliance

| Threat ID | Mitigation | Status |
|-----------|-----------|--------|
| T-06-02 | Whitelist check in getActiveAccountId(): `ACCOUNT_SLUGS.includes(slug) ? slug : "personal"` | Implemented |
| T-06-03 | Whitelist guard in switchAccount action: `if (!ACCOUNT_SLUGS.includes(slug)) return;` | Implemented |
| T-06-04 | voiceProfileAddendum is Houtan's own learned patterns — no sensitive PII; single-user tool | Accepted |

## Known Stubs

None — all data wired. AccountSwitcher reads from DB-seeded accounts. getDrafts queries real posts filtered by accountId. voiceAddendum fetched from accounts row.

## Self-Check: PASSED

- `src/lib/account.ts` — FOUND
- `src/app/actions/switch-account.ts` — FOUND
- `src/app/_components/AccountSwitcher.tsx` — FOUND
- Commit `7c0dfc0` — Task 1 (account utilities, action, component)
- Commit `96b7437` — Task 2 (NavBar, layout, voice-profile, generate-draft, queries, page)
- `npx tsc --noEmit` — exits 0, no errors
