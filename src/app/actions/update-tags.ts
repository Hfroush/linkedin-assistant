"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { posts } from "@/db/schema";

type HookType =
  | "question"
  | "stat"
  | "story"
  | "hot_take"
  | "confession"
  | "contrast"
  | null;

type NarrativeStructure =
  | "hook_insight"
  | "story_arc"
  | "essay"
  | "list"
  | null;

interface TagUpdate {
  hookType?: HookType;
  narrativeStructure?: NarrativeStructure;
  topicId?: number | null;
  scheduledTime?: Date | null;
  status?: "draft" | "published";
}

export async function updateTags(
  postId: string,
  tags: TagUpdate
): Promise<void> {
  if (postId.trim().length === 0) {
    throw new Error("postId is required");
  }
  if (postId.length > 36) {
    throw new Error("Invalid postId");
  }

  await db
    .update(posts)
    .set({
      ...(tags.hookType !== undefined && { hookType: tags.hookType }),
      ...(tags.narrativeStructure !== undefined && {
        narrativeStructure: tags.narrativeStructure,
      }),
      ...(tags.topicId !== undefined && { topicId: tags.topicId }),
      ...(tags.scheduledTime !== undefined && {
        scheduledTime: tags.scheduledTime,
      }),
      ...(tags.status !== undefined && { status: tags.status }),
    })
    .where(eq(posts.id, postId));
}
