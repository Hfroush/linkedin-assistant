import { getDrafts, getTopicAreas, getRecentPostTopics } from "@/db/queries";
import { generateAngles } from "@/app/actions/generate-angles";
import HomeClient from "./_components/HomeClient";
import TopicPromptCard from "./_components/TopicPromptCard";
import type { TopicArea } from "@/db/schema";

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
  const [drafts, topicAreas, recentTopicIds] = await Promise.all([
    getDrafts(),
    getTopicAreas(),
    getRecentPostTopics(14),
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

  return (
    <main className="min-h-screen p-6">
      {topic && (
        <TopicPromptCard topicName={topic.name} angles={angles} />
      )}
      <HomeClient drafts={drafts} topicAreas={topicAreas} />
    </main>
  );
}
