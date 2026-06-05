"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { anthropic } from "@/lib/anthropic";
import { getVoiceProfile } from "@/lib/voice-profile";
import { db } from "@/db/client";
import { draftVersions, posts } from "@/db/schema";
import { getDraftVersions } from "@/db/queries";

const postIdSchema = z.string().uuid();
const draftTextSchema = z.string().trim().min(1).max(12000);

const revisionModeSchema = z.enum([
  "sharper",
  "shorter",
  "more_voice",
  "rewrite_opening",
  "hooks",
]);

const revisionLabels: Record<z.infer<typeof revisionModeSchema>, string> = {
  sharper: "Sharper rewrite",
  shorter: "Shortened rewrite",
  more_voice: "Voice pass",
  rewrite_opening: "Opening rewrite",
  hooks: "Hook options",
};

const revisionInstructions: Record<z.infer<typeof revisionModeSchema>, string> = {
  sharper:
    "Rewrite the post so the claim is sharper and the prose is more direct. Keep the core idea intact. Return only the revised post.",
  shorter:
    "Cut this post by roughly 35 percent. Preserve the strongest claim, remove throat-clearing, and return only the revised post.",
  more_voice:
    "Rewrite this closer to Houtan's voice profile. Make it analytical, concrete, and less polished. Return only the revised post.",
  rewrite_opening:
    "Keep the body mostly intact, but replace the opening with three stronger lines of displacement or tension. Return the full revised post.",
  hooks:
    "Generate five alternative opening hooks for this post. Keep each one under 24 words. Return only the numbered hooks.",
};

export async function getDraftVersionHistory(postId: string) {
  const parsedPostId = postIdSchema.parse(postId);
  return getDraftVersions(parsedPostId);
}

export async function saveEditedDraft({
  postId,
  draftText,
  saveAsFinal = false,
}: {
  postId: string;
  draftText: string;
  saveAsFinal?: boolean;
}): Promise<{ success: true }> {
  const parsedPostId = postIdSchema.parse(postId);
  const parsedDraftText = draftTextSchema.parse(draftText);

  await db
    .update(posts)
    .set({
      draftText: parsedDraftText,
      ...(saveAsFinal && { finalText: parsedDraftText }),
    })
    .where(eq(posts.id, parsedPostId));

  await db.insert(draftVersions).values({
    id: crypto.randomUUID(),
    postId: parsedPostId,
    draftText: parsedDraftText,
    label: saveAsFinal ? "Final edit" : "Manual edit",
  });

  return { success: true };
}

export async function reviseDraft({
  postId,
  draftText,
  mode,
}: {
  postId: string;
  draftText: string;
  mode: z.infer<typeof revisionModeSchema>;
}): Promise<{ draftText: string; label: string }> {
  const parsedPostId = postIdSchema.parse(postId);
  const parsedDraftText = draftTextSchema.parse(draftText);
  const parsedMode = revisionModeSchema.parse(mode);
  const voiceProfileText = await getVoiceProfile();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: parsedMode === "hooks" ? 500 : 1200,
    system: [
      {
        type: "text",
        text: voiceProfileText,
        cache_control: { type: "ephemeral" },
      },
      {
        type: "text",
        text:
          "You are a LinkedIn writing editor for Houtan Froushan. Preserve his analytical, direct style. Avoid generic inspiration-speak, emoji, and hollow calls to action.",
      },
    ],
    messages: [
      {
        role: "user",
        content: `${revisionInstructions[parsedMode]}\n\nDraft:\n${parsedDraftText}`,
      },
    ],
  });

  const revisedText =
    response.content[0]?.type === "text" ? response.content[0].text.trim() : "";

  if (!revisedText) {
    throw new Error("No revision returned");
  }

  if (parsedMode !== "hooks") {
    await db.update(posts).set({ draftText: revisedText }).where(eq(posts.id, parsedPostId));
    await db.insert(draftVersions).values({
      id: crypto.randomUUID(),
      postId: parsedPostId,
      draftText: revisedText,
      label: revisionLabels[parsedMode],
    });
  }

  return { draftText: revisedText, label: revisionLabels[parsedMode] };
}
