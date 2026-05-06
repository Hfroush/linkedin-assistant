import { getTagDimensionStats, getPublishedPostsWithMetrics, getTopicAreas } from "@/db/queries";
import { ReauthBanner } from "./_components/ReauthBanner";
import { StatsTableRow } from "./_components/StatsTableRow";
import { fmtRate, fmtHour } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const [stats, publishedPosts, topicAreas] = await Promise.all([
    getTagDimensionStats(),
    getPublishedPostsWithMetrics(),
    getTopicAreas(),
  ]);

  // Build topicId → name lookup
  const topicMap = Object.fromEntries(topicAreas.map((t) => [t.id, t.name]));

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-10">
      {/* Re-auth banner placeholder — always hidden in Phase 4 (D-10) */}
      <ReauthBanner show={false} />

      {/* Section 1: Aggregate Summary Cards (D-05, PERF-04) */}
      {/* Note: getTagDimensionStats() only includes posts where impressions IS NOT NULL
          and engagementRate IS NOT NULL — sparse rows do not dilute averages */}
      <section>
        <h1 className="text-xl font-semibold text-gray-900 mb-4">Performance Summary</h1>
        {stats.totalPostsWithMetrics === 0 ? (
          <p className="text-sm text-gray-500">
            No posts with complete metrics yet. Enter reactions, comments, reposts, and impressions
            for published posts in the sidebar to see analytics here.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <SummaryCard
              label="Best Hook Type"
              value={stats.bestHookType?.value ?? "—"}
              sub={stats.bestHookType ? fmtRate(stats.bestHookType.avgRate) + " avg" : undefined}
            />
            <SummaryCard
              label="Best Narrative"
              value={stats.bestNarrativeStructure?.value ?? "—"}
              sub={stats.bestNarrativeStructure ? fmtRate(stats.bestNarrativeStructure.avgRate) + " avg" : undefined}
            />
            <SummaryCard
              label="Best Topic Area"
              value={stats.bestTopicId ? (topicMap[stats.bestTopicId.value] ?? `Topic ${stats.bestTopicId.value}`) : "—"}
              sub={stats.bestTopicId ? fmtRate(stats.bestTopicId.avgRate) + " avg" : undefined}
            />
            <SummaryCard
              label="Best Posting Time"
              value={stats.bestPostingHour ? fmtHour(stats.bestPostingHour.value) : "—"}
              sub={stats.bestPostingHour ? fmtRate(stats.bestPostingHour.avgRate) + " avg" : undefined}
            />
            <SummaryCard
              label="Overall Avg Rate"
              value={fmtRate(stats.overallAvgEngagementRate)}
              sub={`${stats.totalPostsWithMetrics} post${stats.totalPostsWithMetrics !== 1 ? "s" : ""} with metrics`}
            />
          </div>
        )}
      </section>

      {/* Section 2: Per-Post Table (D-05, PERF-03) */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">All Published Posts</h2>
        {publishedPosts.length === 0 ? (
          <p className="text-sm text-gray-500">
            No published posts yet. Change a post&apos;s status to &quot;published&quot; in the tag row to see it here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="py-2 pr-4 font-medium">Post</th>
                  <th className="py-2 pr-3 font-medium">Hook</th>
                  <th className="py-2 pr-3 font-medium">Narrative</th>
                  <th className="py-2 pr-3 font-medium">Topic</th>
                  <th className="py-2 pr-3 font-medium">Time</th>
                  <th className="py-2 pr-3 font-medium text-right">Eng. Rate</th>
                  <th className="py-2 pr-3 font-medium">LinkedIn URL</th>
                  <th className="py-2 font-medium">Refresh</th>
                </tr>
              </thead>
              <tbody>
                {publishedPosts.map((post) => {
                  // Use publishedAt ?? scheduledTime ?? createdAt for posting-hour analysis
                  const postingDate = post.publishedAt ?? post.scheduledTime ?? post.createdAt;
                  const postingHour = postingDate
                    ? new Date(postingDate).getUTCHours()
                    : null;
                  return (
                    <StatsTableRow
                      key={post.id}
                      post={post}
                      topicName={post.topicId ? topicMap[post.topicId] : undefined}
                      postingHour={postingHour}
                      fmtHour={fmtHour}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

// Summary card sub-component (inline — no separate file needed)
function SummaryCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-base font-semibold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}
