"use server";

import { anthropic } from "@/lib/anthropic";
import { getVoiceProfile } from "@/lib/voice-profile";
import { db } from "@/db/client";
import { posts } from "@/db/schema";
import { reviewDraft, recordApprovedDraft } from "@/lib/linguistic-guardrail";
import { logger } from "@/lib/logger";

type PostFormat = "story_arc" | "hot_take" | "short_insight" | "essay";

const VALID_FORMATS: PostFormat[] = [
  "story_arc",
  "hot_take",
  "short_insight",
  "essay",
];

const CONTEXT_KEY = "linkedin_posts";

function getFormatInstruction(format: PostFormat): string {
  switch (format) {
    case "story_arc":
      return "Write this as a story arc: open with a scene or moment, build through the middle with earned insight, close before the resolution.";
    case "hot_take":
      return "Write this as a hot take: lead with a strong, specific contrarian claim. No hedging. 150 words max.";
    case "short_insight":
      return "Write this as a short insight: one concrete observation with one specific mechanism. 100-200 words.";
    case "essay":
      return "Write this as an essay: build an argument from a specific premise, hold the metaphor through to the end, close before you explain the lesson. 300-400 words.";
  }
}

async function callClaude(
  voiceProfileText: string,
  systemInstruction: string,
  userMessage: string
): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: voiceProfileText,
        cache_control: { type: "ephemeral" },
      },
      { type: "text", text: systemInstruction },
    ],
    messages: [{ role: "user", content: userMessage }],
  });
  const first = response.content[0];
  if (!first || first.type !== "text") throw new Error("No text content from Claude");
  return first.text;
}

// ---------------------------------------------------------------------------
// Semantic guardrail — Haiku detects violations regex cannot catch
// ---------------------------------------------------------------------------

const SEMANTIC_CHECK_PROMPT = `You are a strict AI writing pattern detector reviewing a LinkedIn post.

Check for these PROHIBITED patterns and flag any you find — even partial matches:

STRUCTURE:
- Negation-then-reframe (any subject): "[Noun] isn't X. It's Y." or "It's rarely X. It's Y." or "X isn't about Y. It's about Z."
- Negative parallelism: stacking "Not X. Not Y." fragments, or "not X, not Y" in sequence
- Fragment lists used rhetorically: "Word. Word. Word." — incomplete sentences stacked for effect
- "not just X, but Y" or "not merely X" constructions

VOCABULARY:
- Any of: pivotal, showcase, underscores, fostering, vibrant, tapestry, garner, intricate, groundbreaking, renowned, breathtaking, profound, encompassing, cultivating, transformative

SENTENCE PATTERNS:
- "serves as a", "stands as a", "functions as a" (copula avoidance — use "is" instead)
- Tailing -ing fake-depth: "underscoring that", "highlighting how", "reflecting its", "showcasing the"
- Fake-depth framing: "The real question is", "What really matters", "At its core", "The heart of the matter"
- Vague attributions: "Experts argue", "Studies suggest", "Industry observers"
- Generic upbeat endings: "The future looks bright", "Exciting times lie ahead"

FORMATTING:
- More than one em dash in a single paragraph

DRAFT TO CHECK:
`;

/**
 * Uses Haiku to semantically detect prohibited patterns that regex cannot catch.
 * Returns a description of violations found, or null if the draft is clean.
 */
async function semanticCheck(draftText: string): Promise<string | null> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system:
        "You are a strict writing quality checker. Be precise. Quote the exact offending text.",
      messages: [
        {
          role: "user",
          content: `${SEMANTIC_CHECK_PROMPT}${draftText}

Reply with ONLY one of:
CLEAN
or
VIOLATIONS:
- [pattern name]: "[exact quote from draft]"
- [pattern name]: "[exact quote from draft]"`,
        },
      ],
    });

    const result =
      response.content[0]?.type === "text"
        ? response.content[0].text.trim()
        : "CLEAN";

    if (result.toUpperCase().startsWith("VIOLATIONS")) {
      return result;
    }
    return null;
  } catch {
    return null; // Non-fatal — fall through if Haiku call fails
  }
}

const DRAFT_SYSTEM_PROMPT =
  "You are a LinkedIn content assistant for Houtan Froushan. Draft posts in exactly the voice described above — the voice profile is your primary constraint. Avoid inspiration-speak, generic motivational language, and hollow calls to action. Personal detail must be load-bearing. Open with displacement, not frame-setting. Close before you finish the argument.\n\nStrict style rules — all violations trigger an automatic rewrite:\n\nStructure:\n- No negative parallelism. Never stack negations ('Not X. Not Y. But Z.' or 'Not X, not Y,'). State what IS true directly.\n- No negation-then-reframe: '[Noun] isn't X. It's Y.' or 'It's rarely X. It's Y.' — this applies to ANY subject, not just 'it'.\n- No two-sentence negation reversals in any form.\n- No 'not just X, but Y' or 'not merely X, but Y' constructions.\n- No rhetorical fragment lists: 'Word. Word. Word.' — write complete sentences.\n\nPunctuation and formatting:\n- Maximum one em dash per paragraph. Rewrite interrupted clauses as full sentences instead.\n- No boldface for emphasis inside body text.\n- No emoji.\n\nVocabulary — never use these words:\npivotal, showcase, underscores, fostering, vibrant, tapestry, garner, intricate, groundbreaking, renowned, breathtaking, profound, encompassing, cultivating, transformative, revolutionary, cutting-edge, seamless, frictionless, robust, delve, journey (metaphorical), landscape (metaphorical), testament, paradigm, synergy.\n\nSentence patterns to avoid:\n- 'Serves as a', 'stands as a', 'functions as a', 'acts as a' — use 'is' instead.\n- Tailing -ing phrases that add fake depth: 'underscoring that...', 'highlighting how...', 'showcasing the...', 'reflecting its...'.\n- Fake-depth framing: 'The real question is', 'What really matters is', 'At its core', 'The heart of the matter'.\n- Signposting: 'Let's dive in', 'Let's explore', 'Here's what you need to know'.\n- Vague attributions: 'Experts argue', 'Studies suggest', 'Industry observers note'.\n- Filler: 'In order to', 'Due to the fact that', 'It is important to note that', 'Needless to say'.\n- Generic upbeat closings: 'The future looks bright', 'Exciting times lie ahead', 'This represents a major step'.\n- Excessive hedging: 'could potentially possibly', 'might have some effect'.";

const REPAIR_SYSTEM_PROMPT =
  "You are a LinkedIn content assistant for Houtan Froushan. Rewrite the post to fix every listed violation. Keep his analytical, direct voice — the voice profile above is your primary constraint. Return only the rewritten post, no explanation.";

export async function generateDraft(
  roughIdea: string,
  format: PostFormat
): Promise<{ postId: string; draftText: string }> {
  if (roughIdea.trim().length === 0) throw new Error("Rough idea cannot be empty");
  if (roughIdea.length > 2000) throw new Error("Rough idea too long (max 2000 characters)");
  if (!VALID_FORMATS.includes(format)) throw new Error("Invalid format");

  const voiceProfileText = await getVoiceProfile();
  const formatInstruction = getFormatInstruction(format);

  // --- 1. Initial draft ---
  let draftText = await callClaude(
    voiceProfileText,
    DRAFT_SYSTEM_PROMPT,
    `${formatInstruction}\n\nRough idea: ${roughIdea}`
  );

  // --- 2. Regex guardrail ---
  try {
    const regexReview = await reviewDraft(draftText, {
      contextKey: CONTEXT_KEY,
      contentGoal: `LinkedIn post about: ${roughIdea.slice(0, 200)}. Keep Houtan's analytical, direct voice.`,
    });

    if (!regexReview.approved && regexReview.repairPrompt) {
      draftText = await callClaude(
        voiceProfileText,
        REPAIR_SYSTEM_PROMPT,
        regexReview.repairPrompt
      );
    }
  } catch (error) {
    logger.error("Regex guardrail failed", error, { roughIdeaLength: roughIdea.length, format });
  }

  // --- 3. Semantic guardrail (catches what regex misses) ---
  try {
    const violations = await semanticCheck(draftText);
    if (violations) {
      logger.warn("Semantic guardrail triggered repair", { violations });
      draftText = await callClaude(
        voiceProfileText,
        REPAIR_SYSTEM_PROMPT,
        `Fix every violation listed below. Keep the core argument and Houtan's voice intact.\n\n${violations}\n\nDraft to fix:\n${draftText}`
      );

      // One final semantic check to confirm the repair worked
      const secondPass = await semanticCheck(draftText);
      if (secondPass) {
        logger.warn("Semantic violations persisted after repair", { secondPass });
      }
    }
  } catch (error) {
    logger.error("Semantic guardrail failed", error, { roughIdeaLength: roughIdea.length });
  }

  // --- 4. Record approved draft ---
  try {
    await recordApprovedDraft(draftText, CONTEXT_KEY);
  } catch {
    // Non-fatal
  }

  // --- 5. Persist to DB ---
  const postId = crypto.randomUUID();
  await db.insert(posts).values({
    id: postId,
    roughIdea: roughIdea.trim(),
    draftText,
    status: "draft",
    createdAt: new Date(),
  });

  return { postId, draftText };
}
