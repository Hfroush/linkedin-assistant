"use client";

import React, { useState } from "react";

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
  onDelete?: (postId: string) => void;
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
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function HistorySidebar({ drafts, onSelect, onDelete }: HistorySidebarProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(e: React.MouseEvent, postId: string) {
    e.stopPropagation(); // don't trigger onSelect
    if (!onDelete) return;
    setDeletingId(postId);
    try {
      await onDelete(postId);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
        Past drafts
      </h2>
      {drafts.length === 0 ? (
        <p className="text-sm text-gray-400">No drafts yet. Generate your first post.</p>
      ) : (
        <ul className="overflow-y-auto max-h-[calc(100vh-8rem)] flex flex-col gap-1">
          {drafts.map((draft) => (
            <li
              key={draft.id}
              onClick={() => onSelect(draft)}
              className="group relative cursor-pointer px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {/* Delete button — visible on hover */}
              {onDelete && (
                <button
                  onClick={(e) => handleDelete(e, draft.id)}
                  disabled={deletingId === draft.id}
                  aria-label="Delete draft"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-30"
                >
                  {deletingId === draft.id ? (
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </button>
              )}
              <p className="text-sm font-medium line-clamp-2 text-gray-800 dark:text-gray-200 leading-snug pr-6">
                {firstLine(draft.draftText)}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-400">{relativeTime(draft.createdAt)}</span>
                {draft.status === "published" && (
                  <>
                    <span className="text-gray-200 dark:text-gray-700">·</span>
                    {draft.engagementRate != null ? (
                      <span className="text-xs font-medium text-blue-600">
                        {(draft.engagementRate * 100).toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-xs text-green-600 font-medium">Published</span>
                    )}
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
