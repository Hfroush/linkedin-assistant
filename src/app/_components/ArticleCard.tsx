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

const TOPIC_COLORS: Record<string, { bg: string; text: string }> = {
  "Founder psychology":                    { bg: "bg-violet-100",  text: "text-violet-700"  },
  "Education as a design problem":         { bg: "bg-blue-100",    text: "text-blue-700"    },
  "The archaeology of institutions":       { bg: "bg-amber-100",   text: "text-amber-700"   },
  "What AI actually changes in education": { bg: "bg-emerald-100", text: "text-emerald-700" },
  "The founder-as-translator":             { bg: "bg-rose-100",    text: "text-rose-700"    },
  "Scale and intimacy":                    { bg: "bg-cyan-100",    text: "text-cyan-700"    },
  "The gap between proof and belief":      { bg: "bg-orange-100",  text: "text-orange-700"  },
};

const DEFAULT_TOPIC_COLOR = { bg: "bg-gray-100", text: "text-gray-500" };

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

  function handleDraftFromThis() {
    const summaryBlock = summary ? `\n\nSummary: ${summary}` : "";
    const prefillText = `${displayTitle} (${sourceUrl})${summaryBlock}\n\nMy take:`;
    sessionStorage.setItem("draftPrefill", prefillText);
    router.push("/");
  }

  return (
    <article className="flex flex-col gap-2 p-4 border border-gray-200 rounded-md bg-white hover:border-gray-300 transition-colors">
      <div className="flex items-center gap-2">
        {topicName && (
          <span className={`text-xs px-2 py-1 rounded font-medium ${(TOPIC_COLORS[topicName] ?? DEFAULT_TOPIC_COLOR).bg} ${(TOPIC_COLORS[topicName] ?? DEFAULT_TOPIC_COLOR).text}`}>
            {topicName}
          </span>
        )}
        <span className="text-xs text-gray-400">
          {sourceType === "bookmark" ? "Bookmark" : "Article"} ·{" "}
          {relativeTime(fetchedAt)}
        </span>
      </div>
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-semibold text-gray-900 hover:text-blue-600 hover:underline leading-snug"
      >
        {displayTitle}
      </a>
      {summary && (
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
          {summary}
        </p>
      )}
      <button
        onClick={handleDraftFromThis}
        className="self-start text-sm text-blue-600 hover:underline mt-1"
      >
        Draft from this →
      </button>
    </article>
  );
}
