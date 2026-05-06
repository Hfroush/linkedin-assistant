"use server";

import { anthropic } from "@/lib/anthropic";
import { updateTags } from "./update-tags";

const VALID_HOOK_TYPES = ["question", "stat", "story", "hot_take", "confession", "contrast"] as const;
const VALID_STRUCTURES = ["hook_insight", "story_arc", "essay", "list"] as const;

type HookType = (typeof VALID_HOOK_TYPES)[number];
type NarrativeStructure = (typeof VALID_STRUCTURES)[number];

export interface AutoTagResult {
  hookType: HookType | null;
  narrativeStructure: NarrativeStructure | null;
  topicId: number | null;
}

export async function autoTagDraft(
  postId: string,
  draftText: string,
  topicAreas: Array<{ id: number; name: string }>
): Promise<AutoTagResult> {
  const topicList = topicAreas.map((t) => `${t.id}: ${t.name}`).join("\n");

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 150,
    system: "You are a content classifier. Respond only with valid JSON — no explanation, no markdown.",
    messages: [
      {
        role: "user",
        content: `Classify this LinkedIn post. Respond with exactly this JSON shape and nothing else:
{"hookType": "...", "narrativeStructure": "...", "topicId": N}

Hook type options: question, stat, story, hot_take, confession, contrast
Narrative structure options: hook_insight, story_arc, essay, list
Topic area options (use the number):
${topicList}

Use null for any dimension you cannot confidently classify.

Post:
${draftText}`,
      },
    ],
  });

  const raw = response.content[0]?.type === "text" ? response.content[0].text.trim() : "{}";

  let parsed: Record<string, unknown> = {};
  try {
    // Strip markdown code fences if the model wraps in them anyway
    const json = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    parsed = JSON.parse(json);
  } catch {
    return { hookType: null, narrativeStructure: null, topicId: null };
  }

  const validTopicIds = new Set(topicAreas.map((t) => t.id));

  const hookType = VALID_HOOK_TYPES.includes(parsed.hookType as HookType)
    ? (parsed.hookType as HookType)
    : null;

  const narrativeStructure = VALID_STRUCTURES.includes(parsed.narrativeStructure as NarrativeStructure)
    ? (parsed.narrativeStructure as NarrativeStructure)
    : null;

  const topicId =
    typeof parsed.topicId === "number" && validTopicIds.has(parsed.topicId)
      ? parsed.topicId
      : null;

  // Persist to DB (fire and don't block — ignore failure)
  try {
    await updateTags(postId, { hookType, narrativeStructure, topicId });
  } catch {
    // Non-fatal
  }

  return { hookType, narrativeStructure, topicId };
}
