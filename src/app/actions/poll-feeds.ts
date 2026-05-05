"use server";

import { db } from "@/db/client";
import { trendingItems } from "@/db/schema";
import { eq, and, gt, isNull, or } from "drizzle-orm";
import Parser from "rss-parser";
import { createHash } from "node:crypto";
import { FEEDS, TOPIC_IDS } from "@/lib/feeds";

const parser = new Parser({ timeout: 8000 }); // 8s timeout — avoids stalling on slow feeds

const TTL_MS = 4 * 60 * 60 * 1000; // 4-hour TTL (RESEARCH.md Assumption A1)

/**
 * Checks each topic's feed data against its TTL.
 * If any topic has no valid (non-expired) items, fetches all feeds for that topic.
 * Uses Promise.allSettled — one dead feed never crashes the poll.
 * Bookmarks (expiresAt = null) are never considered stale.
 */
export async function pollFeedsIfStale(): Promise<void> {
  const now = new Date();

  for (const topicId of TOPIC_IDS) {
    const config = FEEDS[topicId];
    if (!config) continue;

    // DB-TTL gate: check if any non-expired item exists for this topic
    const validItem = await db
      .select({ id: trendingItems.id })
      .from(trendingItems)
      .where(
        and(
          eq(trendingItems.topicId, topicId),
          or(
            isNull(trendingItems.expiresAt),       // bookmarks never expire
            gt(trendingItems.expiresAt, now),       // RSS items still fresh
          )
        )
      )
      .get();

    if (validItem) continue; // fresh data exists — skip RSS fetch for this topic

    // Stale or empty: fetch all feeds for this topic in parallel
    const results = await Promise.allSettled(
      config.urls.map((url) => parser.parseURL(url))
    );

    const expiresAt = new Date(now.getTime() + TTL_MS);

    for (const result of results) {
      if (result.status === "rejected") {
        // Dead feed — log but continue (do not crash the poll)
        console.warn(`[poll-feeds] Feed fetch failed for topic ${topicId}:`, result.reason);
        continue;
      }

      for (const item of result.value.items.slice(0, 20)) {
        if (!item.link) continue;

        const contentHash = createHash("sha256")
          .update(`${item.link}|${item.title ?? ""}`)
          .digest("hex");

        await db
          .insert(trendingItems)
          .values({
            id: crypto.randomUUID(),
            sourceType: "rss",
            sourceUrl: item.link,
            title: item.title ?? null,
            summary: item.contentSnippet ?? item.content ?? null,
            topicId,
            contentHash,
            fetchedAt: now,
            expiresAt,
          })
          .onConflictDoNothing(); // uniqueIndex on contentHash blocks duplicates (Plan 01)
      }
    }
  }
}
