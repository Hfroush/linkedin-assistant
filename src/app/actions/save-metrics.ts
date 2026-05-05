"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/db/client";
import { posts } from "@/db/schema";

export async function saveMetrics({
  postId,
  reactions,
  comments,
  reposts,
  impressions,
}: {
  postId: string;
  reactions: number;
  comments: number;
  reposts: number;
  impressions: number;
}): Promise<{ success: boolean; engagementRate: number | null }> {
  // Input validation: treat NaN or negative values as invalid (review feedback)
  const inputs = { reactions, comments, reposts, impressions };
  for (const [, v] of Object.entries(inputs)) {
    if (!Number.isFinite(v) || v < 0) {
      return { success: false, engagementRate: null };
    }
  }

  // Guard: only update published posts (D-03).
  // Using SQL-level guard — check status in the same query as the update target.
  const existing = await db
    .select({ status: posts.status })
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.status, "published")))
    .limit(1);

  if (!existing[0]) {
    // Post not found or not published — reject silently to enforce D-03
    return { success: false, engagementRate: null };
  }

  // Calculate engagement rate; null when impressions is zero (avoid division by zero / NaN)
  const engagementRate =
    impressions > 0
      ? (reactions + comments + reposts) / impressions
      : null;

  await db
    .update(posts)
    .set({
      reactions,
      comments,
      reposts,
      impressions,
      engagementRate,
      metricsPulledAt: new Date(),
    })
    .where(and(eq(posts.id, postId), eq(posts.status, "published")));

  return { success: true, engagementRate };
}
