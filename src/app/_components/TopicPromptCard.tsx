"use client";

import { useState } from "react";
import { generateTopicPosts } from "@/app/actions/generate-topic-posts";
import type { DraftSummary } from "./HistorySidebar";

interface TopicPromptCardProps {
  topicName: string;
  topicDescription: string;
  onDraftSelect: (draft: DraftSummary) => void;
}

const FORMAT_LABELS: Record<string, string> = {
  short_insight: "Short insight",
  hot_take: "Hot take",
  story_arc: "Story arc",
};

function firstLine(text: string): string {
  const line = text.split("\n").find((l) => l.trim().length > 0);
  return line?.trim() ?? text.slice(0, 80);
}

export default function TopicPromptCard({
  topicName,
  topicDescription,
  onDraftSelect,
}: TopicPromptCardProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "ready">("idle");
  const [posts, setPosts] = useState<DraftSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setStatus("loading");
    setError(null);
    try {
      const results = await generateTopicPosts(topicName, topicDescription);
      setPosts(results);
      setStatus("ready");
    } catch {
      setError("Generation failed — try again");
      setStatus("idle");
    }
  }

  return (
    <section className="p-5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
            Today&apos;s topic
          </p>
          <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {topicName}
          </p>
        </div>

        {status === "idle" && (
          <button
            onClick={handleGenerate}
            className="shrink-0 px-4 py-2 bg-blue-600 text-white text-sm rounded-full hover:bg-blue-700 transition-colors"
          >
            Generate 3 posts
          </button>
        )}

        {status === "loading" && (
          <span className="shrink-0 text-sm text-gray-400 animate-pulse">
            Generating…
          </span>
        )}

        {status === "ready" && (
          <button
            onClick={() => { setPosts([]); setStatus("idle"); }}
            className="shrink-0 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Regenerate
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

      {status === "ready" && posts.length > 0 && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          {posts.map((post, i) => {
            const format = ["short_insight", "hot_take", "story_arc"][i];
            const preview = post.draftText ?? "";
            return (
              <button
                key={post.id}
                onClick={() => onDraftSelect(post)}
                className="text-left p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm transition-all group"
              >
                <span className="inline-block text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-full mb-2">
                  {FORMAT_LABELS[format] ?? format}
                </span>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-1 mb-1">
                  {firstLine(preview)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed">
                  {preview.split("\n").slice(1).join(" ").trim().slice(0, 160)}
                </p>
                <p className="text-xs text-blue-600 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  Use this post →
                </p>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
