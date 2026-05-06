"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { pullMetrics } from "@/app/actions/pull-metrics";
import { saveLinkedInUrl } from "@/app/actions/save-linkedin-url";
import { fmtRate, relativeTime } from "@/lib/format";

interface StatsTableRowProps {
  post: {
    id: string;
    roughIdea: string | null;
    draftText: string | null;
    hookType: string | null;
    narrativeStructure: string | null;
    topicId: number | null;
    scheduledTime: Date | null;
    publishedAt: Date | null;
    createdAt: Date;
    reactions: number | null;
    comments: number | null;
    reposts: number | null;
    impressions: number | null;
    engagementRate: number | null;
    metricsPulledAt: Date | null;
    linkedinPostUrl: string | null;
  };
  topicName: string | undefined;
  postingHour: number | null;
  fmtHour: (hour: number | null | undefined) => string;
}

export function StatsTableRow({ post, topicName, postingHour, fmtHour }: StatsTableRowProps) {
  const router = useRouter();

  const [linkedinUrl, setLinkedinUrl] = useState(post.linkedinPostUrl ?? "");
  const [pulling, setPulling] = useState(false);
  const [pullError, setPullError] = useState<string | null>(null);
  const [localEngRate, setLocalEngRate] = useState(post.engagementRate);
  const [lastSynced, setLastSynced] = useState<Date | null>(post.metricsPulledAt ?? null);

  async function handleRefresh() {
    setPulling(true);
    setPullError(null);
    const result = await pullMetrics({ postId: post.id });
    setPulling(false);
    if (result.success) {
      setLocalEngRate(result.engagementRate);
      setLastSynced(new Date());
      router.refresh();
    } else {
      const errorMessages: Record<string, string> = {
        no_url: "No URL saved",
        no_data: "No data returned",
        timeout: "Timed out — try again",
        not_found: "Post not found",
      };
      setPullError(errorMessages[result.error] ?? "Unknown error");
    }
  }

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="py-2 pr-4 max-w-[200px]">
        <span className="line-clamp-2 text-gray-800">
          {post.roughIdea ?? post.draftText?.slice(0, 80) ?? "—"}
        </span>
      </td>
      <td className="py-2 pr-3 text-gray-600">{post.hookType ?? "—"}</td>
      <td className="py-2 pr-3 text-gray-600">{post.narrativeStructure ?? "—"}</td>
      <td className="py-2 pr-3 text-gray-600">
        {post.topicId ? (topicName ?? `Topic ${post.topicId}`) : "—"}
      </td>
      <td className="py-2 pr-3 text-gray-600">
        {fmtHour(postingHour)}
      </td>
      <td className="py-2 pr-3 text-right font-mono">
        {fmtRate(localEngRate)}
      </td>
      <td className="py-2 pr-3 min-w-[140px]">
        <input
          type="url"
          placeholder="https://linkedin.com/posts/..."
          value={linkedinUrl}
          onChange={(e) => setLinkedinUrl(e.target.value)}
          onBlur={async () => {
            await saveLinkedInUrl({ postId: post.id, url: linkedinUrl });
            router.refresh();
          }}
          className="w-full rounded border border-gray-200 px-1 py-0.5 text-xs focus:outline-none focus:border-blue-400"
        />
      </td>
      <td className="py-2 min-w-[80px]">
        <div className="flex flex-col items-start gap-0.5">
          <button
            onClick={handleRefresh}
            disabled={pulling || !linkedinUrl}
            className="text-xs px-2 py-0.5 rounded border border-blue-200 text-blue-600 hover:bg-blue-50 disabled:opacity-40 whitespace-nowrap"
          >
            {pulling ? "..." : "↻ Refresh"}
          </button>
          {lastSynced && (
            <span className="text-[9px] text-gray-400">
              Synced {relativeTime(lastSynced)}
            </span>
          )}
          {pullError && (
            <span className="text-[9px] text-red-400">{pullError}</span>
          )}
        </div>
      </td>
    </tr>
  );
}
