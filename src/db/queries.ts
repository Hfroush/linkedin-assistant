import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { posts, topicAreas, type Post, type TopicArea } from "@/db/schema";

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
