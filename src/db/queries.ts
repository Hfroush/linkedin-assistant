import { desc, gte, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  posts,
  topicAreas,
  trendingItems,
  type Post,
  type TopicArea,
  type TrendingItem,
} from "@/db/schema";

/**
 * Returns all draft posts ordered by createdAt DESC.
 * Selects columns needed by the sidebar and tag row.
 */
export async function getDrafts(): Promise<
  Pick<
    Post,
    | "id"
    | "roughIdea"
    | "draftText"
    | "createdAt"
    | "hookType"
    | "narrativeStructure"
    | "topicId"
    | "scheduledTime"
    | "status"
  >[]
> {
  return db
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
    })
    .from(posts)
    .orderBy(desc(posts.createdAt));
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
  (TrendingItem & { topicName: string | null })[]
> {
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
    .orderBy(desc(trendingItems.fetchedAt));
  return rows;
}
