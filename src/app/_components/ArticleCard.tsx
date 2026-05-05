"use client";

import { useRouter } from "next/navigation";

// Copied verbatim from HistorySidebar.tsx relativeTime helper
function relativeTime(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

interface ArticleCardProps {
  title: string | null;
  sourceUrl: string;
  summary: string | null;
  topicName: string | null;
  fetchedAt: Date;
  sourceType: "rss" | "bookmark";
}

export default function ArticleCard({
  title,
  sourceUrl,
  summary,
  topicName,
  fetchedAt,
  sourceType,
}: ArticleCardProps) {
  const router = useRouter();

  const displayTitle = title ?? sourceUrl;
  // D-08: article pre-fill format: [title] (url)\n\nMy take:
  const prefill = encodeURIComponent(
    `${displayTitle} (${sourceUrl})\n\nMy take:`
  );

  return (
    <article className="flex flex-col gap-2 p-4 border border-gray-200 rounded-md bg-white hover:border-gray-300 transition-colors">
      <div className="flex items-center gap-2">
        {topicName && (
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {topicName}
          </span>
        )}
        <span className="text-xs text-gray-400">
          {sourceType === "bookmark" ? "Bookmark" : "Article"} ·{" "}
          {relativeTime(fetchedAt)}
        </span>
      </div>
      <p className="text-sm font-semibold text-gray-900 leading-snug">
        {displayTitle}
      </p>
      {summary && (
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
          {summary}
        </p>
      )}
      {/* D-07: full page navigation to /?roughIdea=... — no modal */}
      <button
        onClick={() => router.push(`/?roughIdea=${prefill}`)}
        className="self-start text-sm text-blue-600 hover:underline mt-1"
      >
        Draft from this →
      </button>
    </article>
  );
}
