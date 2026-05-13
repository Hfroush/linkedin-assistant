export const maxDuration = 60;

import { getDrafts, getTopicAreas, getRecentPostTopics, getLatestDigest, getPublishedPostCount } from "@/db/queries";
import { getActiveAccountId } from "@/lib/account";
import { generateDigest } from "@/app/actions/generate-digest";
import HomeClient from "./_components/HomeClient";
import { WeeklyDigestCard } from "./_components/WeeklyDigestCard";
import type { TopicArea } from "@/db/schema";

export const dynamic = "force-dynamic";

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
    getLatestDigest(accountId).catch(() => null),
    getPublishedPostCount(accountId).catch(() => 0),
  ]);

  const topic = selectWeightedTopic(topicAreas, recentTopicIds);

  const DIGEST_TTL_DAYS = 7;
  const DIGEST_MIN_POSTS = 3;
  let digestText: string | null = null;

  if (publishedPostCount >= DIGEST_MIN_POSTS) {
    try {
      if (latestDigest == null) {
        digestText = await generateDigest();
      } else {
        const digestAge = latestDigest.createdAt
          ? (Date.now() - new Date(latestDigest.createdAt).getTime()) / (1000 * 60 * 60 * 24)
          : Infinity;
        if (digestAge > DIGEST_TTL_DAYS) {
          digestText = await generateDigest();
        } else {
          try {
            const parsed = JSON.parse(latestDigest.digestJson ?? "{}") as { text?: string };
            digestText = parsed.text ?? null;
          } catch {
            digestText = null;
          }
        }
      }
    } catch {
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
        topicDescription={topic?.description ?? null}
        accountId={accountId}
      />
    </main>
  );
}
