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

export async function generateDraft(
  roughIdea: string,
  format: PostFormat
): Promise<{ postId: string; draftText: string }> {
  if (roughIdea.trim().length === 0) throw new Error("Rough idea cannot be empty");
  if (roughIdea.length > 2000) throw new Error("Rough idea too long (max 2000 characters)");
  if (!VALID_FORMATS.includes(format)) throw new Error("Invalid format");

  const voiceProfileText = await getVoiceProfile();
  const formatInstruction = getFormatInstruction(format);
  const draftSystemPrompt =
    "You are a LinkedIn content assistant for Houtan Froushan. Draft posts in exactly the voice described above — the voice profile is your primary constraint. Avoid inspiration-speak, generic motivational language, and hollow calls to action. Personal detail must be load-bearing. Open with displacement, not frame-setting. Close before you finish the argument.\n\nStrict style rules — all violations trigger an automatic rewrite:\n\nStructure:\n- No negative parallelism. Never stack negations ('Not X. Not Y. But Z.' or 'Not X, not Y,'). State what IS true directly.\n- No two-sentence negation reversals ('It's not X. It's Y.').\n- No 'not just X, but Y' or 'not merely X, but Y' constructions.\n- No rule-of-three lists used purely for rhythm ('efficiency, productivity, and innovation').\n\nPunctuation and formatting:\n- Maximum one em dash per paragraph. Rewrite interrupted clauses as full sentences instead.\n- No boldface for emphasis inside body text.\n- No emoji.\n\nVocabulary — never use these words:\npivotal, showcase, underscores, fostering, vibrant, tapestry, garner, intricate, groundbreaking, renowned, breathtaking, profound, encompassing, cultivating, transformative, revolutionary, cutting-edge, seamless, frictionless, robust, delve, journey (metaphorical), landscape (metaphorical), testament, paradigm, synergy.\n\nSentence patterns to avoid:\n- 'Serves as a', 'stands as a', 'functions as a', 'acts as a' — use 'is' instead.\n- Tailing -ing phrases that add fake depth: 'underscoring that...', 'highlighting how...', 'showcasing the...', 'reflecting its...'.\n- Fake-depth framing: 'The real question is', 'What really matters is', 'At its core', 'The heart of the matter'.\n- Signposting: 'Let's dive in', 'Let's explore', 'Here's what you need to know'.\n- Vague attributions: 'Experts argue', 'Studies suggest', 'Industry observers note'.\n- Filler: 'In order to', 'Due to the fact that', 'It is important to note that', 'Needless to say'.\n- Generic upbeat closings: 'The future looks bright', 'Exciting times lie ahead', 'This represents a major step'.\n- Excessive hedging: 'could potentially possibly', 'might have some effect'.";

  // --- Initial draft ---
  let draftText = await callClaude(
    voiceProfileText,
    draftSystemPrompt,
    `${formatInstruction}\n\nRough idea: ${roughIdea}`
  );

  // --- Linguistic guardrail: review → repair (one attempt) → record ---
  try {
    let finalReview = await reviewDraft(draftText, {
      contextKey: CONTEXT_KEY,
      contentGoal: `LinkedIn post about: ${roughIdea.slice(0, 200)}. Keep Houtan's analytical, direct voice.`,
    });

    if (!finalReview.approved && finalReview.repairPrompt) {
      draftText = await callClaude(
        voiceProfileText,
        "You are a LinkedIn content assistant for Houtan Froushan. Rewrite the post following the repair instructions exactly. Keep his analytical, direct voice — the voice profile above is your primary constraint.",
        finalReview.repairPrompt
      );

      finalReview = await reviewDraft(draftText, {
        contextKey: CONTEXT_KEY,
        contentGoal: `LinkedIn post about: ${roughIdea.slice(0, 200)}. Keep Houtan's analytical, direct voice.`,
      });
    }

    if (finalReview.approved) {
      await recordApprovedDraft(draftText, CONTEXT_KEY);
    } else {
      logger.warn("Draft did not pass linguistic guardrail after repair", {
        score: finalReview.score,
        issues: finalReview.issues.map((issue) => issue.ruleName),
      });
    }
  } catch (error) {
    logger.error("Linguistic guardrail failed", error, {
      roughIdeaLength: roughIdea.length,
      format,
    });
  }

  // --- Persist to DB ---
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
