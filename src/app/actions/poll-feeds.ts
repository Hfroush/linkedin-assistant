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
  const expiresAt = new Date(now.getTime() + TTL_MS);

  // Fan out topic polling in parallel — reduces worst-case latency from 56s → 8s (CR-03)
  await Promise.allSettled(
    TOPIC_IDS.map(async (topicId) => {
      const config = FEEDS[topicId];
      if (!config) return;

      // DB-TTL gate: check if any non-expired item exists for this topic
      const [validItem] = await db
        .select({ id: trendingItems.id })
        .from(trendingItems)
        .where(
          and(
            eq(trendingItems.topicId, topicId),
            or(
              isNull(trendingItems.expiresAt), // bookmarks never expire
              gt(trendingItems.expiresAt, now), // RSS items still fresh
            )
          )
        )
        .limit(1);

      if (validItem) return; // fresh data exists — skip RSS fetch for this topic

      // Stale or empty: fetch all feeds for this topic in parallel
      const results = await Promise.allSettled(
        config.urls.map((url) => parser.parseURL(url))
      );

      for (const result of results) {
        if (result.status === "rejected") {
          console.warn(`[poll-feeds] Feed fetch failed for topic ${topicId}:`, result.reason);
          continue;
        }

        const values = result.value.items
          .slice(0, 20)
          .filter((item) => !!item.link)
          .map((item) => ({
            id: crypto.randomUUID(),
            sourceType: "rss" as const,
            sourceUrl: item.link!,
            title: item.title ?? null,
            summary: item.contentSnippet ?? item.content ?? null,
            topicId,
            contentHash: createHash("sha256")
              .update(`${item.link}|${item.title ?? ""}`)
              .digest("hex"),
            fetchedAt: now,
            expiresAt,
          }));

        if (values.length > 0) {
          await db.insert(trendingItems).values(values).onConflictDoNothing();
        }
      }
    })
  );
}
