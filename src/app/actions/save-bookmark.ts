"use server";

import { db } from "@/db/client";
import { trendingItems } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { createHash } from "node:crypto";
import { z } from "zod";

const urlSchema = z.string().url();

/**
 * Fetches a URL and extracts og:title, og:description, or <title>/<meta description>
 * from the raw HTML. Falls back to null if the fetch fails or times out.
 */
async function fetchPageMetadata(
  url: string
): Promise<{ title: string | null; summary: string | null }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; LinkedInAssistant/1.0; +https://github.com/houtan)",
        Accept: "text/html",
      },
    });
    clearTimeout(timeout);
    if (!response.ok) return { title: null, summary: null };

    // Only read up to 100 KB — enough for <head> metadata on any page
    const buffer = await response.arrayBuffer();
    const html = new TextDecoder().decode(buffer.slice(0, 100_000));

    // og:title (attribute order can vary)
    const title =
      html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']{1,500})["']/i)?.[1] ??
      html.match(/<meta[^>]+content=["']([^"']{1,500})["'][^>]+property=["']og:title["']/i)?.[1] ??
      html.match(/<title[^>]*>([^<]{1,500})<\/title>/i)?.[1]?.trim() ??
      null;

    // og:description or meta description
    const summary =
      html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']{1,1000})["']/i)?.[1] ??
      html.match(/<meta[^>]+content=["']([^"']{1,1000})["'][^>]+property=["']og:description["']/i)?.[1] ??
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{1,1000})["']/i)?.[1] ??
      html.match(/<meta[^>]+content=["']([^"']{1,1000})["'][^>]+name=["']description["']/i)?.[1] ??
      null;

    return {
      title: title?.replace(/\s+/g, " ").trim() ?? null,
      summary: summary?.replace(/\s+/g, " ").trim() ?? null,
    };
  } catch {
    return { title: null, summary: null };
  }
}

/**
 * Inserts a user-provided URL as a bookmark in trendingItems.
 * sourceType: 'bookmark', expiresAt: null (bookmarks never expire).
 * Fetches og:title / og:description from the page so "Draft from this" has
 * real content to seed generation with.
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

  // Best-effort metadata fetch — falls back to URL-as-title if it fails
  const meta = await fetchPageMetadata(validUrl);

  await db
    .insert(trendingItems)
    .values({
      id: crypto.randomUUID(),
      sourceType: "bookmark",
      sourceUrl: validUrl,
      title: meta.title ?? validUrl,
      summary: meta.summary ?? null,
      topicId: null,
      contentHash,
      fetchedAt: new Date(),
      expiresAt: null, // bookmarks never expire
    })
    .onConflictDoNothing(); // duplicate URL bookmark → silently ignored

  revalidatePath("/discover"); // force /discover Server Component re-render
}
