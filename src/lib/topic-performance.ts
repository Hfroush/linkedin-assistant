import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { topicPerformance, topicAreas } from "@/db/schema";

// ---------------------------------------------------------------------------
// updateTopicPerformance
// ---------------------------------------------------------------------------

/**
 * Upserts a topic_performance row for the given account × topic pair.
 * Called from logPublishedVersion when a post with topicId and engagementRate is published.
 *
 * Uses a running average formula:
 *   newAvg = ((existingAvg * existingCount) + newRate) / (existingCount + 1)
 * This avoids loading all historical engagement rates.
 *
 * @param accountId - DB account id (1=personal, 2=ucl, 3=startup)
 * @param topicId - topic_areas.id (1-7)
 * @param engagementRate - calculated engagement rate for the just-published post (null = skip update)
 */
export async function updateTopicPerformance(
  accountId: number,
  topicId: number,
  engagementRate: number | null
): Promise<void> {
  // Skip upsert when no engagement data — avoids inflating postsPublished denominator
  if (engagementRate === null) return;
  if (engagementRate < 0) return;

  await db
    .insert(topicPerformance)
    .values({
      accountId,
      topicId,
      postsPublished: 1,
      avgEngagementRate: engagementRate,
      lastUpdatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [topicPerformance.accountId, topicPerformance.topicId],
      set: {
        postsPublished: sql`${topicPerformance.postsPublished} + 1`,
        // Running average: (existingAvg * existingCount + newRate) / (existingCount + 1)
        // When engagementRate is null, keep existing average
        avgEngagementRate:
          engagementRate !== null
            ? sql`
                CASE
                  WHEN ${topicPerformance.avgEngagementRate} IS NULL THEN ${engagementRate}
                  ELSE (${topicPerformance.avgEngagementRate} * ${topicPerformance.postsPublished} + ${engagementRate})
                     / (${topicPerformance.postsPublished} + 1)
                END
              `
            : topicPerformance.avgEngagementRate, // no change when null
        lastUpdatedAt: new Date(),
      },
    });
}

// ---------------------------------------------------------------------------
// getTopicPerformanceMatrix — cross-account aggregate
// ---------------------------------------------------------------------------

export interface TopicPerformanceRow {
  topicId: number;
  topicName: string;
  crossAccountAvgRate: number | null;
  totalPostsPublished: number;
}

/**
 * Returns all topics with their cross-account average engagement rate,
 * ordered by crossAccountAvgRate DESC (best performing first).
 * Topics with no published posts (or no engagement data) are included with null rate.
 */
export async function getTopicPerformanceMatrix(): Promise<TopicPerformanceRow[]> {
  // Load all topic_performance rows joined with topic names
  const rows = await db
    .select({
      topicId: topicPerformance.topicId,
      topicName: topicAreas.name,
      avgEngagementRate: topicPerformance.avgEngagementRate,
      postsPublished: topicPerformance.postsPublished,
    })
    .from(topicPerformance)
    .innerJoin(topicAreas, eq(topicPerformance.topicId, topicAreas.id));

  // JavaScript-side aggregation: group by topicId, compute weighted cross-account average
  const grouped: Record<
    number,
    { topicName: string; totalWeightedRate: number; totalPosts: number; hasRate: boolean }
  > = {};

  for (const row of rows) {
    if (!grouped[row.topicId]) {
      grouped[row.topicId] = {
        topicName: row.topicName,
        totalWeightedRate: 0,
        totalPosts: 0,
        hasRate: false,
      };
    }
    grouped[row.topicId].totalPosts += row.postsPublished;
    if (row.avgEngagementRate !== null) {
      // Weighted by postsPublished from this account
      grouped[row.topicId].totalWeightedRate += row.avgEngagementRate * row.postsPublished;
      grouped[row.topicId].hasRate = true;
    }
  }

  const result: TopicPerformanceRow[] = Object.entries(grouped).map(([topicIdStr, agg]) => {
    const topicId = Number(topicIdStr);
    const crossAccountAvgRate = agg.hasRate ? agg.totalWeightedRate / agg.totalPosts : null;
    return {
      topicId,
      topicName: agg.topicName,
      crossAccountAvgRate,
      totalPostsPublished: agg.totalPosts,
    };
  });

  // Sort: topics with rate first (descending), then no-rate topics
  result.sort((a, b) => {
    if (a.crossAccountAvgRate === null && b.crossAccountAvgRate === null) return 0;
    if (a.crossAccountAvgRate === null) return 1;
    if (b.crossAccountAvgRate === null) return -1;
    return b.crossAccountAvgRate - a.crossAccountAvgRate;
  });

  return result;
}

// ---------------------------------------------------------------------------
// getTopTopicsForSoftSignal — top 2 topics for injection into generate-draft
// ---------------------------------------------------------------------------

/**
 * Returns the top 2 topic names by cross-account average engagement rate.
 * Returns empty array if no performance data exists yet.
 * Used by generate-draft.ts as a soft non-cached signal in the user message.
 * Requires >= 2 published posts to filter out single-post noise.
 */
export async function getTopTopicsForSoftSignal(): Promise<string[]> {
  const matrix = await getTopicPerformanceMatrix();
  return matrix
    .filter((row) => row.crossAccountAvgRate !== null && row.totalPostsPublished >= 2)
    .slice(0, 2)
    .map((row) => row.topicName);
}
