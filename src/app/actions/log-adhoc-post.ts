"use server";

import { db } from "@/db/client";
import { posts } from "@/db/schema";
import { revalidatePath } from "next/cache";

/**
 * Logs a post that was written ad-hoc (outside the AI drafting flow).
 * Creates a published posts row directly — no voice_corrections entry,
 * since there is no AI draft to compare against.
 *
 * draftText is set to content so the history sidebar can show a preview.
 */
export async function logAdhocPost({
  content,
  topicId,
  hookType,
  narrativeStructure,
  accountId,
}: {
  content: string;
  topicId?: number | null;
  hookType?: string | null;
  narrativeStructure?: string | null;
  accountId: number;
}): Promise<{ success: boolean; postId?: string }> {
  if (!content || content.trim().length === 0) throw new Error("Content is required");
  if (content.length > 10000) throw new Error("Content too long (max 10,000 characters)");
  if (!Number.isInteger(accountId) || accountId < 1 || accountId > 3)
    throw new Error("Invalid accountId");

  const postId = crypto.randomUUID();
  const now = new Date();

  await db.insert(posts).values({
    id: postId,
    roughIdea: null,
    draftText: content.trim(),      // used by history sidebar for preview
    publishedText: content.trim(),
    status: "published",
    selectionState: "published",
    publishedAt: now,
    accountId,
    topicId: topicId ?? null,
    hookType: hookType ?? null,
    narrativeStructure: narrativeStructure ?? null,
    createdAt: now,
  });

  revalidatePath("/");
  return { success: true, postId };
}
