"use client";

import { useState, Suspense } from "react";
import DraftPanel from "./DraftPanel";
import AdHocPostForm from "./AdHocPostForm";
import HistorySidebar from "./HistorySidebar";
import TopicPromptCard from "./TopicPromptCard";
import { deleteDraft } from "@/app/actions/delete-draft";
import type { DraftSummary } from "./HistorySidebar";

type Mode = "draft" | "import";

interface HomeClientProps {
  drafts: DraftSummary[];
  topicAreas: Array<{ id: number; name: string }>;
  topicName: string | null;
  topicDescription: string | null;
  accountId?: number;
}

export default function HomeClient({ drafts: initialDrafts, topicAreas, topicName, topicDescription, accountId = 1 }: HomeClientProps) {
  const [loadedDraft, setLoadedDraft] = useState<DraftSummary | null>(null);
  const [drafts, setDrafts] = useState<DraftSummary[]>(initialDrafts);
  const [mode, setMode] = useState<Mode>("draft");

  async function handleDelete(postId: string) {
    // Optimistic removal
    setDrafts((prev) => prev.filter((d) => d.id !== postId));
    // If the deleted draft is currently loaded, clear the panel
    if (loadedDraft?.id === postId) setLoadedDraft(null);
    await deleteDraft(postId);
  }

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      {topicName && topicDescription && (
        <TopicPromptCard
          topicName={topicName}
          topicDescription={topicDescription}
          onDraftSelect={(draft) => setLoadedDraft(draft)}
        />
      )}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <section>
          {/* Mode toggle */}
          <div className="flex items-center gap-1 mb-4">
            <button
              type="button"
              onClick={() => setMode("draft")}
              className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                mode === "draft"
                  ? "bg-gray-900 dark:bg-gray-100 border-gray-900 dark:border-gray-100 text-white dark:text-gray-900"
                  : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400"
              }`}
            >
              Draft a post
            </button>
            <button
              type="button"
              onClick={() => setMode("import")}
              className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                mode === "import"
                  ? "bg-gray-900 dark:bg-gray-100 border-gray-900 dark:border-gray-100 text-white dark:text-gray-900"
                  : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400"
              }`}
            >
              Import existing
            </button>
          </div>

          {mode === "draft" ? (
            <Suspense fallback={null}>
              <DraftPanel
                topicAreas={topicAreas}
                loadedDraft={loadedDraft}
                seedIdea={null}
                accountId={accountId}
              />
            </Suspense>
          ) : (
            <AdHocPostForm topicAreas={topicAreas} accountId={accountId} />
          )}
        </section>
        <aside className="lg:border-l lg:pl-6">
          <HistorySidebar drafts={drafts} onSelect={(draft) => { setLoadedDraft(draft); setMode("draft"); }} onDelete={handleDelete} />
        </aside>
      </div>
    </div>
  );
}
