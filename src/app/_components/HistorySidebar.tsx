"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { saveMetrics } from "@/app/actions/save-metrics";
import { saveLinkedInUrl } from "@/app/actions/save-linkedin-url";
import { pullMetrics } from "@/app/actions/pull-metrics";

export type DraftSummary = {
  id: string;
  roughIdea: string | null;
  draftText: string | null;
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
  linkedinPostUrl: string | null;
  metricsPulledAt: Date | null;
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

  // Refresh state
  const [linkedinUrl, setLinkedinUrl] = useState(draft.linkedinPostUrl ?? "");
  const [pulling, setPulling] = useState(false);
  const [pullError, setPullError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(
    draft.metricsPulledAt ?? null
  );

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

  async function handleRefresh() {
    setPulling(true);
    setPullError(null);
    const result = await pullMetrics({ postId: draft.id });
    setPulling(false);
    if (result.success) {
      setReactions(result.reactions);
      setComments(result.comments);
      setReposts(result.reposts);
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
    <div
      className="mt-2 pt-2 border-t border-gray-100"
      onClick={(e) => e.stopPropagation()}
    >
      {/* LinkedIn URL input */}
      <div className="flex items-center gap-1 mt-1">
        <span className="text-gray-400 text-[10px] whitespace-nowrap">LinkedIn URL</span>
        <input
          type="url"
          placeholder="https://linkedin.com/posts/..."
          value={linkedinUrl}
          onChange={(e) => setLinkedinUrl(e.target.value)}
          onBlur={async () => {
            await saveLinkedInUrl({ postId: draft.id, url: linkedinUrl });
            router.refresh();
          }}
          className="flex-1 rounded border border-gray-200 px-1 py-0.5 text-[10px] focus:outline-none focus:border-blue-400 min-w-0"
        />
      </div>

      {/* Metric inputs row */}
      <div className="flex items-center gap-1 text-xs mt-1">
        <MetricInput label="React" value={reactions} onChange={setReactions} onBlur={handleBlur} />
        <MetricInput label="Cmnt" value={comments} onChange={setComments} onBlur={handleBlur} />
        <MetricInput label="Rpst" value={reposts} onChange={setReposts} onBlur={handleBlur} />
        <MetricInput label="Impr" value={impressions} onChange={setImpressions} onBlur={handleBlur} />
        <span className="ml-1 text-xs text-gray-500 whitespace-nowrap">
          {liveRate != null ? `${liveRate.toFixed(1)}%` : "—"}
        </span>
        {saving && <span className="text-xs text-gray-400">saving…</span>}
        {linkedinUrl && (
          <button
            onClick={handleRefresh}
            disabled={pulling}
            className="ml-1 text-[10px] px-1.5 py-0.5 rounded border border-blue-200 text-blue-600 hover:bg-blue-50 disabled:opacity-50 whitespace-nowrap"
          >
            {pulling ? "..." : "↻"}
          </button>
        )}
      </div>

      {/* Last synced timestamp */}
      {lastSynced && (
        <span className="text-[9px] text-gray-400 mt-0.5 block">
          Synced {relativeTime(lastSynced)}
        </span>
      )}
      {pullError && (
        <span className="text-[9px] text-red-400 mt-0.5 block">{pullError}</span>
      )}
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
