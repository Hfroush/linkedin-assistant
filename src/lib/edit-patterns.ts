import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { voiceCorrections, accounts, voiceProfile } from "@/db/schema";
import { anthropic } from "@/lib/anthropic";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// EditPattern — structured output from Haiku edit analysis
// ---------------------------------------------------------------------------
export interface EditPattern {
  type:
    | "vocabulary_swap"
    | "structure_change"
    | "length_reduction"
    | "tone_shift"
    | "opening_rewrite"
    | "closing_rewrite"
    | "other";
  description: string; // e.g., "Changed 'transformative' → 'practical'"
  severity: "minor" | "moderate" | "major"; // minor=1-2 word changes, major=paragraph restructure
}

// ---------------------------------------------------------------------------
// Haiku prompt — returns JSON array of EditPattern objects only
// ---------------------------------------------------------------------------
const EDIT_EXTRACTION_PROMPT = `Compare the DRAFT and PUBLISHED versions of a LinkedIn post.
Extract the edit patterns as structured JSON.

Return ONLY valid JSON — an array of EditPattern objects, no explanation, no markdown:
[{"type": "vocabulary_swap"|"structure_change"|"length_reduction"|"tone_shift"|"opening_rewrite"|"closing_rewrite"|"other", "description": "...", "severity": "minor"|"moderate"|"major"}]

If the texts are identical or near-identical (fewer than 10 characters changed), return: []

DRAFT:
{DRAFT_TEXT}

PUBLISHED:
{PUBLISHED_TEXT}`;

// ---------------------------------------------------------------------------
// extractEditPatterns — Haiku job, non-blocking from logPublishedVersion
// ---------------------------------------------------------------------------

/**
 * Extracts structured EditPattern[] from a draft→published pair using Claude Haiku.
 * Updates voice_corrections.edit_patterns with the JSON result.
 * Called fire-and-forget from logPublishedVersion — must not throw to caller.
 */
export async function extractEditPatterns(
  correctionId: string,
  draftText: string,
  publishedText: string
): Promise<void> {
  try {
    const prompt = EDIT_EXTRACTION_PROMPT.replace("{DRAFT_TEXT}", draftText).replace(
      "{PUBLISHED_TEXT}",
      publishedText
    );

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      system: "Return only valid JSON. No explanation, no markdown, no code fences.",
      messages: [{ role: "user", content: prompt }],
    });

    const raw =
      response.content[0]?.type === "text" ? response.content[0].text.trim() : "[]";

    let patterns: EditPattern[];
    try {
      patterns = JSON.parse(raw) as EditPattern[];
      // Validate it's an array
      if (!Array.isArray(patterns)) {
        logger.warn("extractEditPatterns: response is not an array", { raw: raw.slice(0, 200) });
        return;
      }
    } catch {
      // Haiku occasionally produces invalid JSON — store null, log raw for debugging
      logger.error("extractEditPatterns: JSON.parse failed", new Error("JSON parse failed"), {
        raw: raw.slice(0, 500),
        correctionId,
      });
      return;
    }

    await db
      .update(voiceCorrections)
      .set({ editPatterns: JSON.stringify(patterns) })
      .where(eq(voiceCorrections.id, correctionId));
  } catch (err) {
    // Non-fatal — correction row retains value even without edit_patterns
    logger.error("extractEditPatterns: LLM call or DB update failed", err as Error, {
      correctionId,
    });
  }
}

// ---------------------------------------------------------------------------
// Re-synthesis prompt — compact voice addendum, max 150 words
// ---------------------------------------------------------------------------
const RESYNTH_PROMPT_PREFIX = `You are analysing a series of edits that Houtan made to AI-generated LinkedIn posts before publishing them.
Your task: synthesise the recurring editing patterns into a compact style guide addendum.

Rules:
- Maximum 150 words
- Be specific and actionable: list concrete patterns, not abstract advice
- Focus on what he consistently CHANGES (not what stays the same)
- Use plain prose — no bullet headers, no section titles
- Write in second person: "You tend to..." or "You consistently..."

Here are the edit pairs — each shows DRAFT → PUBLISHED text:
`;

// ---------------------------------------------------------------------------
// resynthesizeVoiceAddendum — Sonnet job, threshold-gated
// ---------------------------------------------------------------------------

/**
 * Synthesises a voice profile addendum from all voice_corrections for an account.
 * Uses Claude Sonnet for quality. Called fire-and-forget from logPublishedVersion.
 * Updates accounts.voice_profile_addendum.
 */
export async function resynthesizeVoiceAddendum(accountId: number): Promise<void> {
  try {
    // Fetch all corrections for this account (draft + published text pairs)
    const corrections = await db
      .select({
        draftText: voiceCorrections.draftText,
        publishedText: voiceCorrections.publishedText,
      })
      .from(voiceCorrections)
      .where(eq(voiceCorrections.accountId, accountId));

    if (corrections.length === 0) return;

    // Fetch base voice profile for this account (used as cached Block 1)
    const [vpRow] = await db
      .select({ rawText: voiceProfile.rawText })
      .from(voiceProfile)
      .where(eq(voiceProfile.accountId, accountId))
      .limit(1);

    const baseVoiceText = vpRow?.rawText ?? "";

    // Build the pairs text for the prompt
    const pairsText = corrections
      .map(
        (c, i) =>
          `--- Edit ${i + 1} ---\nDRAFT:\n${c.draftText}\n\nPUBLISHED:\n${c.publishedText}`
      )
      .join("\n\n");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      system: [
        {
          type: "text",
          text: baseVoiceText,
          cache_control: { type: "ephemeral" }, // Block 1: cached base voice profile
        },
        {
          type: "text",
          text: "You are a writing style analyst for Houtan Froushan's LinkedIn content.",
        },
      ],
      messages: [
        {
          role: "user",
          content: `${RESYNTH_PROMPT_PREFIX}\n${pairsText}`,
        },
      ],
    });

    const addendum =
      response.content[0]?.type === "text" ? response.content[0].text.trim() : null;

    if (!addendum || addendum.length < 20) {
      logger.warn("resynthesizeVoiceAddendum: response too short or empty", {
        accountId,
        length: addendum?.length ?? 0,
      });
      return;
    }

    // Store addendum — overwrites previous version (no history needed per RESEARCH.md anti-pattern)
    await db
      .update(accounts)
      .set({ voiceProfileAddendum: addendum })
      .where(eq(accounts.id, accountId));

    logger.warn("resynthesizeVoiceAddendum: complete", {
      accountId,
      correctionCount: corrections.length,
      addendumLength: addendum.length,
    });
  } catch (err) {
    logger.error("resynthesizeVoiceAddendum: failed", err as Error, { accountId });
  }
}
