# Phase 2: Core Drafting - Context

**Gathered:** 2026-05-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 delivers the first usable product: a single-screen web UI where Houtan types a rough idea, picks a post format, generates a LinkedIn draft in his voice, tags it across 5 dimensions, copies it to clipboard, and can scroll a sidebar of past drafts. No content discovery, no performance tracking, no publishing automation.

</domain>

<decisions>
## Implementation Decisions

### App Structure & Entry Point
- **D-01:** Drafting is the home screen (`/`). When Houtan opens the app, he sees the draft input immediately — no dashboard, no navigation step. Phase 3 will add a discovery panel alongside this screen; the layout should anticipate a sidebar or panel being added later without a full redesign.

### Draft Interaction Flow
- **D-02:** The draft appears on the same screen as the input — same-screen, draft below input. No navigation on submit. Rough idea textarea at the top, generated draft appears below it. Feels like a conversation, not a multi-step form.
- **D-03:** Input form is a plain multi-line textarea for the rough idea plus a format picker dropdown (story arc / hot take / short insight / essay). No topic selector in the input — topic is set as a tag after generation.

### Tagging UX
- **D-04:** Tags are inline below the generated draft — a compact row of dropdowns (hook type, narrative structure, topic area, posting time, status) that appear as soon as the draft is generated. Houtan fills them in while the draft is still visible. This satisfies TAGS-05 (inline, not a separate step).
- **D-05:** The 5 tag dimensions map directly to the DB schema columns: `hookType`, `narrativeStructure`, `topicId`, `scheduledTime`, `status`. The tag dropdowns update the post row in real time (or on save).

### Draft History Sidebar
- **D-06:** Draft history lives in a sidebar on the same screen — a scrollable list of past drafts alongside the main drafting area. No separate `/history` page.
- **D-07:** Each sidebar item shows: first line of the draft text + timestamp. Compact, enough to recognize the post.
- **D-08:** Clicking a past draft in the sidebar loads it into the main draft area — the full draft text appears in the draft panel with its tags pre-populated. Houtan can copy it, retag it, or regenerate from the same rough idea.

### Claude's Discretion
- Format of the post format picker (dropdown vs segmented button vs radio group) — planner decides based on what's simplest.
- Whether draft generation is streaming or a single response — streaming is better UX but planner should decide based on complexity.
- How the copy-to-clipboard button is positioned relative to the draft.
- Whether "save draft" is automatic (on generation) or requires an explicit save action.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Goals and Constraints
- `.planning/PROJECT.md` — core value, constraints (single-user, voice fidelity bar, no auth)
- `.planning/REQUIREMENTS.md` — VOCE-03, VOCE-04, VOCE-05, TAGS-01–05, PUBL-01 are the Phase 2 requirements

### Phase Definition
- `.planning/ROADMAP.md` §Phase 2 — goal, success criteria, upstream dependencies
- `.planning/STATE.md` — current project position and accumulated decisions

### Phase 1 Output (dependencies)
- `.planning/phases/01-foundation/01-02-SUMMARY.md` — DB schema details; `posts` table has all 5 tag columns
- `.planning/phases/01-foundation/01-03-SUMMARY.md` — `getVoiceProfile()` is the canonical import for all LLM calls
- `.planning/phases/01-foundation/01-04-SUMMARY.md` — system array pattern with `cache_control: { type: "ephemeral" }` MUST be used for all LLM calls; never string form

### Stack Decisions
- `.planning/research/STACK.md` — full stack rationale; §AI/LLM has prompt caching approach
- `.planning/phases/01-foundation/01-AI-SPEC.md` §3 — entry point pattern for cached system prompts (use array form)

### Voice Profile Source
- `Houtan Linkedin.docx` (project root) — parsed voice profile; inject via `getVoiceProfile()` on every LLM call

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/voice-profile.ts` — exports `getVoiceProfile()`: call this at the start of every draft generation. Never inline the DB query.
- `src/lib/anthropic.ts` — exports the `anthropic` singleton. Use this in Server Actions; do not create a new Anthropic client.
- `src/db/client.ts` — exports `db` singleton. Use this for all DB queries.
- `src/db/schema.ts` — `posts` table with all 5 tag columns already defined: `hookType`, `narrativeStructure`, `topicId`, `scheduledTime`, `status`, plus `roughIdea`, `draftText`, `finalText`, `createdAt`.

### Established Patterns
- **Fail-fast guards:** All singleton clients (Anthropic, Turso) throw at startup on missing env vars. Don't add defensive null checks in calling code.
- **Cached system prompt:** Voice profile injected as array form with `cache_control: { type: "ephemeral" }` — see `scripts/seed.ts` for the exact pattern. This is non-negotiable.
- **Server Components default:** Next.js 15 App Router — components are Server Components unless `"use client"` is explicit. LLM calls go in Server Actions.
- **No auth system:** Single-user tool — no session, no login, no middleware.

### Integration Points
- Draft generation: Server Action reads voice profile via `getVoiceProfile()`, calls `anthropic.messages.create()` with the cached system array, writes the result to the `posts` table.
- Tag updates: Server Action updates the `posts` row by id with the 5 tag column values.
- Draft history: DB query on `posts` table ordered by `createdAt` DESC, returning `id`, `draftText`, `createdAt`.

</code_context>

<specifics>
## Specific Ideas

- The 7 topic areas need to be seeded into the `topic_areas` table for the topic tag dropdown to work. This seed should run as part of the app startup or alongside `npm run seed`.
- Post format options for the picker: "Story arc", "Hot take", "Short insight", "Essay" — these map to VOCE-04 and influence the draft generation prompt.
- The format picker and rough idea input are the two inputs that go into the LLM prompt. The format selected should shape the system or user message (e.g., "Write this as a hot take: ...").

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 2-Core Drafting*
*Context gathered: 2026-05-04*
