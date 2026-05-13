"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { saveMetrics } from "@/app/actions/save-metrics";

export type DraftSummary = {
  id: string;
  roughIdea: string | null;
  draftText: string | null;
  finalText: string | null;
  createdAt: Date;
  hookType: string | null;
  narrativeStructure: string | null;
  topicId: number | null;
  scheduledTime: Date | null;
  status: "draft" | "published";
  reactions: number | null;
  comments: number | null;
  reposts: number | null;
  impressions: number | null;
  engagementRate: number | null;
};

interface HistorySidebarProps {
  drafts: DraftSummary[];
  onSelect: (draft: DraftSummary) => void;
}

function firstLine(text: string | null): string {
  if (!text) return "Untitled draft";
  const line = text.split("\n").find((l) => l.trim().length > 0);
  return line?.trim() ?? "Untitled draft";
}

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

function MetricInput({
  label,
  value,
  onChange,
  onBlur,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  onBlur: () => void;
}) {
  return (
    <label className="flex flex-col items-center gap-0.5">
      <span className="text-gray-400 text-[10px]">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onBlur={onBlur}
        className="w-14 rounded border border-gray-200 px-1 py-0.5 text-xs text-center focus:outline-none focus:border-blue-400"
      />
    </label>
  );
}

function MetricsRow({ draft }: { draft: DraftSummary }) {
  const router = useRouter();
  const [reactions, setReactions] = useState(draft.reactions ?? 0);
  const [comments, setComments] = useState(draft.comments ?? 0);
  const [reposts, setReposts] = useState(draft.reposts ?? 0);
  const [impressions, setImpressions] = useState(draft.impressions ?? 0);
  const [saving, setSaving] = useState(false);

  // Live engagement rate: recalculated on every keystroke (D-02)
  const liveRate =
    impressions > 0
      ? ((reactions + comments + reposts) / impressions) * 100
      : null;

  async function handleBlur() {
    setSaving(true);
    await saveMetrics({ postId: draft.id, reactions, comments, reposts, impressions });
    setSaving(false);
    // Sync sidebar state with DB after save (review feedback)
    router.refresh();
  }

  return (
    <div
      className="mt-2 pt-2 border-t border-gray-100"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-1 text-xs">
        <MetricInput label="React" value={reactions} onChange={setReactions} onBlur={handleBlur} />
        <MetricInput label="Cmnt" value={comments} onChange={setComments} onBlur={handleBlur} />
        <MetricInput label="Rpst" value={reposts} onChange={setReposts} onBlur={handleBlur} />
        <MetricInput label="Impr" value={impressions} onChange={setImpressions} onBlur={handleBlur} />
        <span className="ml-1 text-xs text-gray-500 whitespace-nowrap">
          {liveRate != null ? `${liveRate.toFixed(1)}%` : "—"}
        </span>
        {saving && <span className="text-xs text-gray-400">saving…</span>}
      </div>
    </div>
  );
}

export default function HistorySidebar({
  drafts,
  onSelect,
}: HistorySidebarProps) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
        Past drafts
      </h2>
      {drafts.length === 0 ? (
        <p className="text-sm text-gray-400">
          No drafts yet. Generate your first post.
        </p>
      ) : (
        <ul className="overflow-y-auto max-h-[calc(100vh-8rem)]">
          {drafts.map((draft) => (
            <li
              key={draft.id}
              onClick={() => onSelect(draft)}
              className="cursor-pointer p-3 rounded hover:bg-gray-100 border-b last:border-b-0"
            >
              <p className="text-sm font-medium line-clamp-2 text-gray-800">
                {firstLine(draft.draftText)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {relativeTime(draft.createdAt)}
              </p>
              {draft.status === "published" && (
                <MetricsRow draft={draft} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
