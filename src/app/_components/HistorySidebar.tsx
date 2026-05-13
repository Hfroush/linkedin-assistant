"use client";

import React from "react";

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
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export default function HistorySidebar({ drafts, onSelect }: HistorySidebarProps) {
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
              className="cursor-pointer px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <p className="text-sm font-medium line-clamp-2 text-gray-800 dark:text-gray-200 leading-snug">
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
