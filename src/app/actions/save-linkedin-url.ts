"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/db/client";
import { posts } from "@/db/schema";

export async function saveLinkedInUrl({
  postId,
  url,
}: {
  postId: string;
  url: string;
}): Promise<{ success: boolean }> {
  // Guard: only update published posts (T-05-07)
  const existing = await db
    .select({ status: posts.status })
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.status, "published")))
    .limit(1);
  if (!existing[0]) return { success: false };

  await db
    .update(posts)
    .set({ linkedinPostUrl: url || null }) // empty string → null
    .where(and(eq(posts.id, postId), eq(posts.status, "published")));

  return { success: true };
}
