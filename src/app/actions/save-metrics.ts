"use server";

import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { posts } from "@/db/schema";
import { calculateEngagementRate } from "@/lib/metrics";

const metricsSchema = z.object({
  postId: z.string().uuid(),
  reactions: z.number().int().min(0).max(1_000_000),
  comments: z.number().int().min(0).max(1_000_000),
  reposts: z.number().int().min(0).max(1_000_000),
  impressions: z.number().int().min(0).max(100_000_000),
});

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
  const parsed = metricsSchema.safeParse({
    postId,
    reactions,
    comments,
    reposts,
    impressions,
  });

  if (!parsed.success) {
    return { success: false, engagementRate: null };
  }

  // Input validation: treat NaN or negative values as invalid (review feedback)
  let engagementRate: number | null;
  try {
    engagementRate = calculateEngagementRate(parsed.data);
  } catch {
    // Invalid numeric input should fail closed without attempting a DB write.
    return { success: false, engagementRate: null };
  }

  // Guard: only update published posts (D-03).
  // Using SQL-level guard — check status in the same query as the update target.
  const existing = await db
    .select({ status: posts.status })
    .from(posts)
    .where(and(eq(posts.id, parsed.data.postId), eq(posts.status, "published")))
    .limit(1);

  if (!existing[0]) {
    // Post not found or not published — reject silently to enforce D-03
    return { success: false, engagementRate: null };
  }

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
    .where(and(eq(posts.id, parsed.data.postId), eq(posts.status, "published")));

  return { success: true, engagementRate };
}
