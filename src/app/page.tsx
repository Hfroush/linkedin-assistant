// Apify scrapes take 15-40s — extend timeout for pullMetrics Server Action calls
export const maxDuration = 60;

import { getDrafts, getTopicAreas, getRecentPostTopics, getLatestDigest, getPublishedPostCount } from "@/db/queries";
import { getActiveAccountId } from "@/lib/account";
import { generateAngles } from "@/app/actions/generate-angles";
import { generateDigest } from "@/app/actions/generate-digest";
import HomeClient from "./_components/HomeClient";
import { WeeklyDigestCard } from "./_components/WeeklyDigestCard";
import type { TopicArea } from "@/db/schema";

export const dynamic = "force-dynamic";

// Weighted random topic selection — prefers topics not in recentTopicIds.
// If all 7 topics appear in recentTopicIds, falls back to any topic.
// 14-day recency window (RESEARCH.md Pattern 4 — planner's discretion).
function selectWeightedTopic(
  topicAreas: TopicArea[],
  recentTopicIds: number[]
): TopicArea | null {
  if (topicAreas.length === 0) return null;
  const recentSet = new Set(recentTopicIds);
  const fresh = topicAreas.filter((t) => !recentSet.has(t.id));
  const pool = fresh.length > 0 ? fresh : topicAreas;
  return pool[Math.floor(Math.random() * pool.length)];
}

export default async function Home() {
  const accountId = await getActiveAccountId();
  const [drafts, topicAreas, recentTopicIds, latestDigest, publishedPostCount] = await Promise.all([
    getDrafts(accountId).catch(() => [] as Awaited<ReturnType<typeof getDrafts>>),
    getTopicAreas().catch(() => [] as Awaited<ReturnType<typeof getTopicAreas>>),
    getRecentPostTopics(14).catch(() => [] as number[]),
    getLatestDigest().catch(() => null),
    getPublishedPostCount().catch(() => 0),
  ]);

  // Select topic — weighted random avoiding recent (D-04)
  const topic = selectWeightedTopic(topicAreas, recentTopicIds);

  // Generate angles — Claude-powered, cached voice profile (D-06)
  // Wrapped in try/catch: failure hides the card, never blocks the draft panel
  let angles: string[] = [];
  if (topic) {
    try {
      angles = await generateAngles(topic.name, topic.description);
    } catch {
      // silent fail — TopicPromptCard renders null on []
    }
  }

  // Digest staleness check and conditional regeneration (D-07: auto-regenerate if > 7 days old)
  const DIGEST_TTL_DAYS = 7;
  const DIGEST_MIN_POSTS = 3;

  let digestText: string | null = null;

  if (publishedPostCount >= DIGEST_MIN_POSTS) {
    try {
      if (latestDigest == null) {
        // No digest yet — generate one
        digestText = await generateDigest();
      } else {
        // Check if the stored digest is stale
        const digestAge = latestDigest.createdAt
          ? (Date.now() - new Date(latestDigest.createdAt).getTime()) / (1000 * 60 * 60 * 24)
          : Infinity;
        if (digestAge > DIGEST_TTL_DAYS) {
          digestText = await generateDigest();
        } else {
          // Use stored digest
          try {
            const parsed = JSON.parse(latestDigest.digestJson ?? "{}") as { text?: string };
            digestText = parsed.text ?? null;
          } catch {
            digestText = null;
          }
        }
      }
    } catch {
      // silent fail — Claude API failure returns null digestText; page still renders
      digestText = null;
    }
  }

  return (
    <main className="min-h-screen p-6">
      {digestText != null && (
        <WeeklyDigestCard digestText={digestText} />
      )}
      <HomeClient
        drafts={drafts}
        topicAreas={topicAreas}
        topicName={topic?.name ?? null}
        angles={angles}
        accountId={accountId}
      />
    </main>
  );
}
