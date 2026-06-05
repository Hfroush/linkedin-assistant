"use server";

import { generateDraft } from "./generate-draft";
import type { DraftSummary } from "@/app/_components/HistorySidebar";

const FORMATS = ["short_insight", "hot_take", "story_arc"] as const;

/**
 * Generates 3 posts on the topic of the day, one per format.
 * Each post is saved to DB and returned as a minimal DraftSummary.
 * Runs in parallel — all 3 generate simultaneously.
 */
export async function generateTopicPosts(
  topicName: string,
  topicDescription: string
): Promise<DraftSummary[]> {
  const roughIdea = `${topicName}: ${topicDescription}`;

  const results = await Promise.all(
    FORMATS.map((format) => generateDraft(roughIdea, format))
  );

  return results.map((r) => ({
    id: r.postId,
    draftText: r.draftText,
    roughIdea,
    createdAt: new Date(),
    status: "draft" as const,
    hookType: null,
    narrativeStructure: null,
    topicId: null,
    scheduledTime: null,
    reactions: null,
    comments: null,
    reposts: null,
    impressions: null,
    engagementRate: null,
    linkedinPostUrl: null,
    metricsPulledAt: null,
    finalText: null,
  }));
}
