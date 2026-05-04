"use client";

type DraftSummary = {
  id: string;
  roughIdea: string | null;
  draftText: string | null;
  createdAt: Date;
  hookType: string | null;
  narrativeStructure: string | null;
  topicId: number | null;
  scheduledTime: Date | null;
  status: "draft" | "published";
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export type { DraftSummary };
