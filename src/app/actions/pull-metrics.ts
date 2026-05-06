"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/db/client";
import { posts } from "@/db/schema";
import { pullLinkedInPostMetrics } from "@/lib/apify";
import { calculateEngagementRate } from "@/lib/metrics";

// Vercel Pro plan required — 60-second function timeout.
// Without this export, Vercel Hobby caps at 10 seconds (Apify scrapes take 15-40s).
// If on Hobby plan, most calls will timeout. Upgrade to Pro or accept high failure rate.
export const maxDuration = 60;

type PullResult =
  | {
      success: true;
      reactions: number;
      comments: number;
      reposts: number;
      engagementRate: number | null;
    }
  | {
      success: false;
      error: "no_url" | "no_data" | "timeout" | "not_found";
    };

export async function pullMetrics({
  postId,
}: {
  postId: string;
}): Promise<PullResult> {
  // 1. Load post — guard: must be published and have a linkedinPostUrl
  const existing = await db
    .select({
      status: posts.status,
      linkedinPostUrl: posts.linkedinPostUrl,
      impressions: posts.impressions,
    })
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.status, "published")))
    .limit(1);

  if (!existing[0]) return { success: false, error: "not_found" };
  if (!existing[0].linkedinPostUrl) return { success: false, error: "no_url" };

  // 2. Call Apify — non-destructive: if this fails, DB is not touched
  const result = await pullLinkedInPostMetrics(existing[0].linkedinPostUrl);

  if (!result.ok) {
    return { success: false, error: result.reason };
  }

  const { total_reactions: reactions, comments, reposts } = result.stats;

  // 3. Recalculate engagementRate only when impressions is present
  // Never divide by null/zero — stay null per CONTEXT.md decision
  const impressions = existing[0].impressions;
  let engagementRate: number | null = null;
  if (impressions != null && impressions > 0) {
    engagementRate = calculateEngagementRate({
      reactions,
      comments,
      reposts,
      impressions,
    });
  }

  // 4. Write to DB — reactions/comments/reposts/metricsPulledAt only
  // Never write impressions here — impressions remain manual-entry only
  const updatePayload: {
    reactions: number;
    comments: number;
    reposts: number;
    metricsPulledAt: Date;
    engagementRate?: number;
  } = {
    reactions,
    comments,
    reposts,
    metricsPulledAt: new Date(),
  };

  if (engagementRate != null) {
    updatePayload.engagementRate = engagementRate;
  }

  await db
    .update(posts)
    .set(updatePayload)
    .where(and(eq(posts.id, postId), eq(posts.status, "published")));

  return { success: true, reactions, comments, reposts, engagementRate };
}
