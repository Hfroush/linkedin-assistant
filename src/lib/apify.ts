import { ApifyClient } from "apify-client";

// Singleton — server-side only. Never import from client components.
// APIFY_API_KEY must never be prefixed with NEXT_PUBLIC_.
export const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_KEY!,
});

const ACTOR_ID = "electrifying_haircut/linkedin-post-scraper";

export interface ApifyLinkedInStats {
  total_reactions: number;
  comments: number;
  reposts: number;
}

export type ApifyResult =
  | { ok: true; stats: ApifyLinkedInStats }
  | { ok: false; reason: "timeout" | "no_data" };

/**
 * Calls the Apify LinkedIn Post Scraper actor for a single post URL.
 * Returns a discriminated union:
 *   { ok: true, stats } — actor succeeded and returned data
 *   { ok: false, reason: "timeout" } — actor did not succeed (timeout or error)
 *   { ok: false, reason: "no_data" } — actor succeeded but returned empty items
 *
 * waitSecs: 55 — leaves 5-second buffer for DB write under Vercel Pro 60s limit.
 */
export async function pullLinkedInPostMetrics(
  postUrl: string
): Promise<ApifyResult> {
  // Strip tracking params — the actor's URL parser chokes on ?utm_source=... etc.
  const cleanUrl = postUrl.split("?")[0].replace(/\/$/, "");

  const run = await apifyClient
    .actor(ACTOR_ID)
    .call({ postUrl: cleanUrl, li_at: process.env.LINKEDIN_LI_AT, jsessionid: process.env.LINKEDIN_JSESSIONID }, { waitSecs: 55 });

  if (run.status !== "SUCCEEDED") {
    return { ok: false, reason: "timeout" };
  }

  const { items } = await apifyClient
    .dataset(run.defaultDatasetId)
    .listItems();

  const item = items[0] as
    | { stats?: ApifyLinkedInStats }
    | undefined;

  if (!item?.stats) return { ok: false, reason: "no_data" };

  return { ok: true, stats: item.stats };
}
