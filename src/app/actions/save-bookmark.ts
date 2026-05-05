"use server";

import { db } from "@/db/client";
import { trendingItems } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { createHash } from "node:crypto";
import { z } from "zod";

const urlSchema = z.string().url();

/**
 * Inserts a user-provided URL as a bookmark in trendingItems.
 * sourceType: 'bookmark', expiresAt: null (bookmarks never expire).
 * Uses the URL itself as the title — no server-side fetch (avoids SSRF).
 */
export async function saveBookmark(url: string): Promise<void> {
  // Input validation
  if (!url || url.trim().length === 0) {
    throw new Error("Enter a full URL starting with https://");
  }

  const result = urlSchema.safeParse(url.trim());
  if (!result.success) {
    throw new Error("Enter a full URL starting with https://");
  }

  const validUrl = result.data;

  // Only allow http/https — reject other schemes (ftp://, javascript://, etc.)
  if (!validUrl.startsWith("https://") && !validUrl.startsWith("http://")) {
    throw new Error("Enter a full URL starting with https://");
  }

  const contentHash = createHash("sha256")
    .update(`${validUrl}|bookmark`)
    .digest("hex");

  await db
    .insert(trendingItems)
    .values({
      id: crypto.randomUUID(),
      sourceType: "bookmark",
      sourceUrl: validUrl,
      title: validUrl, // Phase 3: URL as title — no server-side fetch
      summary: null,
      topicId: null,
      contentHash,
      fetchedAt: new Date(),
      expiresAt: null, // bookmarks never expire
    })
    .onConflictDoNothing(); // duplicate URL bookmark → silently ignored

  revalidatePath("/discover"); // force /discover Server Component re-render
}
