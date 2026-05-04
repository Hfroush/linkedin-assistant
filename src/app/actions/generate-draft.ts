"use server";

import { anthropic } from "@/lib/anthropic";
import { getVoiceProfile } from "@/lib/voice-profile";
import { db } from "@/db/client";
import { posts } from "@/db/schema";

type PostFormat = "story_arc" | "hot_take" | "short_insight" | "essay";

const VALID_FORMATS: PostFormat[] = [
  "story_arc",
  "hot_take",
  "short_insight",
  "essay",
];

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

export async function generateDraft(
  roughIdea: string,
  format: PostFormat
): Promise<{ postId: string; draftText: string }> {
  // Input validation — performed before any API call
  if (roughIdea.trim().length === 0) {
    throw new Error("Rough idea cannot be empty");
  }
  if (roughIdea.length > 2000) {
    throw new Error("Rough idea too long (max 2000 characters)");
  }
  if (!VALID_FORMATS.includes(format)) {
    throw new Error("Invalid format");
  }

  const voiceProfileText = await getVoiceProfile();
  const formatInstruction = getFormatInstruction(format);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: voiceProfileText,
        cache_control: { type: "ephemeral" },
      },
      {
        type: "text",
        text: "You are a LinkedIn content assistant for Houtan Froushan. Draft posts in exactly the voice described above — the voice profile is your primary constraint. Avoid inspiration-speak, generic motivational language, and hollow calls to action. Personal detail must be load-bearing. Open with displacement, not frame-setting. Close before you finish the argument.",
      },
    ],
    messages: [
      {
        role: "user",
        content: `${formatInstruction}\n\nRough idea: ${roughIdea}`,
      },
    ],
  });

  const firstContent = response.content[0];
  if (!firstContent || firstContent.type !== "text") {
    throw new Error("Unexpected response format from Claude — no text content");
  }

  const draftText = firstContent.text;

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
