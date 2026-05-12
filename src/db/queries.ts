import { desc, gte, eq, gt, isNull, or, sql, and, isNotNull, lt } from "drizzle-orm";
import { db } from "@/db/client";
import {
  posts,
  topicAreas,
  trendingItems,
  weeklyDigests,
  voiceCorrections,
  accounts,
  type Post,
  type TopicArea,
  type TrendingItem,
  type Account,
} from "@/db/schema";

/**
 * Returns all draft posts ordered by createdAt DESC.
 * Selects columns needed by the sidebar and tag row.
 */
type DraftRow = {
  id: string;
  roughIdea: string | null;
  draftText: string | null;
  createdAt: Date;
  hookType: string | null;
  narrativeStructure: string | null;
  topicId: number | null;
  scheduledTime: Date | null;
  status: "draft" | "published";
  reactions: number | null;
  comments: number | null;
  reposts: number | null;
  impressions: number | null;
  engagementRate: number | null;
  linkedinPostUrl: string | null;
  metricsPulledAt: Date | null;
};

export async function getDrafts(accountId: number): Promise<DraftRow[]> {
  // Lazy abandoned detection: mark drafts older than 7 days with no action as abandoned
  await db
    .update(posts)
    .set({ selectionState: "abandoned" })
    .where(
      and(
        isNull(posts.selectionState),
        eq(posts.status, "draft"),
        lt(posts.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      )
    );

  const rows = await db
    .select({
      id: posts.id,
      roughIdea: posts.roughIdea,
      draftText: posts.draftText,
      createdAt: posts.createdAt,
      hookType: posts.hookType,
      narrativeStructure: posts.narrativeStructure,
      topicId: posts.topicId,
      scheduledTime: posts.scheduledTime,
      status: posts.status,
      reactions: posts.reactions,
      comments: posts.comments,
      reposts: posts.reposts,
      impressions: posts.impressions,
      engagementRate: posts.engagementRate,
      linkedinPostUrl: posts.linkedinPostUrl,
      metricsPulledAt: posts.metricsPulledAt,
    })
    .from(posts)
    .where(eq(posts.accountId, accountId))
    .orderBy(desc(posts.createdAt));
  return rows as DraftRow[];
}

/**
 * Returns all 7 topic areas for use in the tag dropdown.
 */
export async function getTopicAreas(): Promise<TopicArea[]> {
  return db.select().from(topicAreas);
}

/**
 * Returns the topicIds used in posts created within the last `windowDays` days.
 * Used by page.tsx to avoid suggesting topics Houtan has written about recently.
 * Recency window: 14 days (RESEARCH.md Pattern 4 — planner's discretion).
 */
export async function getRecentPostTopics(windowDays = 14): Promise<number[]> {
  const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ topicId: posts.topicId })
    .from(posts)
    .where(gte(posts.createdAt, cutoff))
    .orderBy(desc(posts.createdAt));
  return rows.map((r) => r.topicId).filter((id): id is number => id !== null);
}

/**
 * Returns all trendingItems joined with their topic name from topicAreas.
 * Ordered by fetchedAt DESC — most recently fetched items appear first.
 * Used by /discover page to render the inspiration feed.
 */
export async function getTrendingItems(): Promise<
  (Omit<TrendingItem, "sourceType"> & { sourceType: "rss" | "bookmark"; topicName: string | null })[]
> {
  const now = new Date();
  const rows = await db
    .select({
      id: trendingItems.id,
      sourceType: trendingItems.sourceType,
      sourceUrl: trendingItems.sourceUrl,
      title: trendingItems.title,
      summary: trendingItems.summary,
      topicId: trendingItems.topicId,
      contentHash: trendingItems.contentHash,
      fetchedAt: trendingItems.fetchedAt,
      expiresAt: trendingItems.expiresAt,
      topicName: topicAreas.name,
    })
    .from(trendingItems)
    .leftJoin(topicAreas, eq(trendingItems.topicId, topicAreas.id))
    .where(
      or(
        isNull(trendingItems.expiresAt), // bookmarks never expire
        gt(trendingItems.expiresAt, now), // RSS items still within TTL
      )
    )
    .orderBy(desc(trendingItems.fetchedAt));
  return rows as (Omit<TrendingItem, "sourceType"> & { sourceType: "rss" | "bookmark"; topicName: string | null })[];
}

/**
 * Returns all published posts with full metric columns.
 * Accepts an optional accountId to scope results to a specific account.
 * NOTE: "published" here means status = 'published' — not necessarily that impressions have
 * been entered. Use getTagDimensionStats() for aggregations that require real metrics data
 * (it filters to impressions IS NOT NULL internally).
 */
export async function getPublishedPostsWithMetrics(accountId?: number) {
  const conditions = [eq(posts.status, "published")];
  if (accountId !== undefined) {
    conditions.push(eq(posts.accountId, accountId) as any);
  }
  return db
    .select({
      id: posts.id,
      roughIdea: posts.roughIdea,
      draftText: posts.draftText,
      hookType: posts.hookType,
      narrativeStructure: posts.narrativeStructure,
      topicId: posts.topicId,
      scheduledTime: posts.scheduledTime,
      publishedAt: posts.publishedAt,
      reactions: posts.reactions,
      comments: posts.comments,
      reposts: posts.reposts,
      impressions: posts.impressions,
      engagementRate: posts.engagementRate,
      metricsPulledAt: posts.metricsPulledAt,
      linkedinPostUrl: posts.linkedinPostUrl,
      status: posts.status,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .where(and(...conditions))
    .orderBy(desc(posts.createdAt));
}

/**
 * Returns the total count of published posts (status = 'published').
 * Used for digest eligibility checks (D-06: show digest only after 3+ published posts).
 * Note: this count includes posts that may not yet have impressions entered.
 * For metrics-ready posts specifically, see getTagDimensionStats().totalPostsWithMetrics.
 */
export async function getPublishedPostCount() {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(posts)
    .where(eq(posts.status, "published"));
  return result[0]?.count ?? 0;
}

/**
 * Computes best performer per tag dimension using JavaScript-side aggregation.
 * Only posts with impressions AND engagementRate entered are included — sparse rows
 * (no impressions) are excluded so they don't dilute or distort averages.
 * Accepts an optional accountId to scope results to a specific account.
 */
export async function getTagDimensionStats(accountId?: number) {
  // Load all published posts that have impressions entered (exclude sparse rows)
  const conditions = [
    eq(posts.status, "published"),
    isNotNull(posts.impressions),
    isNotNull(posts.engagementRate),
  ];
  if (accountId !== undefined) {
    conditions.push(eq(posts.accountId, accountId) as any);
  }
  const publishedPosts = await db
    .select({
      hookType: posts.hookType,
      narrativeStructure: posts.narrativeStructure,
      topicId: posts.topicId,
      scheduledTime: posts.scheduledTime,
      engagementRate: posts.engagementRate,
    })
    .from(posts)
    .where(and(...conditions));

  // Helper: group by string key and average engagementRate
  function bestInDimension<T extends string | number | null>(
    rows: typeof publishedPosts,
    key: keyof typeof publishedPosts[0]
  ): { value: T; avgRate: number } | null {
    const groups: Record<string, { sum: number; count: number }> = {};
    for (const row of rows) {
      const val = row[key];
      if (val == null || row.engagementRate == null) continue;
      const k = String(val);
      if (!groups[k]) groups[k] = { sum: 0, count: 0 };
      groups[k].sum += row.engagementRate;
      groups[k].count += 1;
    }
    let bestKey: string | null = null;
    let bestAvg = -1;
    for (const [k, { sum, count }] of Object.entries(groups)) {
      const avg = sum / count;
      if (avg > bestAvg) { bestAvg = avg; bestKey = k; }
    }
    if (bestKey == null) return null;
    return { value: bestKey as T, avgRate: bestAvg };
  }

  // Posting hour: derive from scheduledTime timestamp
  const rowsWithHour = publishedPosts
    .filter((r) => r.scheduledTime != null && r.engagementRate != null)
    .map((r) => ({
      ...r,
      postingHour: new Date(r.scheduledTime!).getUTCHours(),
    }));

  function bestHour(): { value: number; avgRate: number } | null {
    const groups: Record<number, { sum: number; count: number }> = {};
    for (const row of rowsWithHour) {
      const h = row.postingHour;
      if (!groups[h]) groups[h] = { sum: 0, count: 0 };
      groups[h].sum += row.engagementRate!;
      groups[h].count += 1;
    }
    let bestH: number | null = null;
    let bestAvg = -1;
    for (const [h, { sum, count }] of Object.entries(groups)) {
      const avg = sum / count;
      if (avg > bestAvg) { bestAvg = avg; bestH = Number(h); }
    }
    if (bestH == null) return null;
    return { value: bestH, avgRate: bestAvg };
  }

  // Overall average engagement rate
  const ratesWithValues = publishedPosts
    .map((r) => r.engagementRate)
    .filter((r): r is number => r != null);
  const overallAvgEngagementRate =
    ratesWithValues.length > 0
      ? ratesWithValues.reduce((a, b) => a + b, 0) / ratesWithValues.length
      : null;

  return {
    bestHookType: bestInDimension<string>(publishedPosts, "hookType"),
    bestNarrativeStructure: bestInDimension<string>(publishedPosts, "narrativeStructure"),
    bestTopicId: bestInDimension<number>(publishedPosts, "topicId"),
    bestPostingHour: bestHour(),
    overallAvgEngagementRate,
    totalPostsWithMetrics: ratesWithValues.length,
  };
}

/**
 * Returns the most recently created weeklyDigests row, or null if none exist.
 * Accepts an optional accountId to scope results to a specific account.
 * Used by home page.tsx to determine whether to show or regenerate the digest card (D-06, D-07).
 */
export async function getLatestDigest(accountId?: number) {
  if (accountId !== undefined) {
    const result = await db
      .select()
      .from(weeklyDigests)
      .where(eq(weeklyDigests.accountId, accountId))
      .orderBy(desc(weeklyDigests.createdAt))
      .limit(1);
    return result[0] ?? null;
  }
  const result = await db
    .select()
    .from(weeklyDigests)
    .orderBy(desc(weeklyDigests.createdAt))
    .limit(1);
  return result[0] ?? null;
}

// ---------------------------------------------------------------------------
// PHASE 6 — account learning status
// ---------------------------------------------------------------------------

export interface AccountLearningStatus {
  correctionsCount: number;
  lastResynthAt: Date | null;
  hasAddendum: boolean;
  displayName: string;
}

/**
 * Returns edit learning status for a given account.
 * Used by the stats page to show "Voice profile last updated N posts ago" or "No learning data yet".
 */
export async function getAccountLearningStatus(
  accountId: number
): Promise<AccountLearningStatus> {
  // Count corrections for this account
  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(voiceCorrections)
    .where(eq(voiceCorrections.accountId, accountId));

  const correctionsCount = countResult[0]?.count ?? 0;

  // Get account metadata
  const [accountRow] = await db
    .select({
      displayName: accounts.displayName,
      lastResynthAt: accounts.lastResynthAt,
      voiceProfileAddendum: accounts.voiceProfileAddendum,
    })
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .limit(1);

  return {
    correctionsCount,
    lastResynthAt: accountRow?.lastResynthAt ?? null,
    hasAddendum: !!(accountRow?.voiceProfileAddendum && accountRow.voiceProfileAddendum.length > 0),
    displayName: accountRow?.displayName ?? "Unknown",
  };
}
