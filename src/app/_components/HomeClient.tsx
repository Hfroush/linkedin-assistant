"use client";

import { useState, Suspense } from "react";
import DraftPanel from "./DraftPanel";
import HistorySidebar from "./HistorySidebar";
import TopicPromptCard from "./TopicPromptCard";
import type { DraftSummary } from "./HistorySidebar";

interface HomeClientProps {
  drafts: DraftSummary[];
  topicAreas: Array<{ id: number; name: string }>;
  topicName: string | null;
  topicDescription: string | null;
  accountId?: number;
}

export default function HomeClient({ drafts, topicAreas, topicName, topicDescription, accountId = 1 }: HomeClientProps) {
  const [loadedDraft, setLoadedDraft] = useState<DraftSummary | null>(null);

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
          <h1 className="text-xl font-semibold mb-4">Draft a post</h1>
          <Suspense fallback={null}>
            <DraftPanel
              topicAreas={topicAreas}
              loadedDraft={loadedDraft}
              seedIdea={null}
              accountId={accountId}
            />
          </Suspense>
        </section>
        <aside className="lg:border-l lg:pl-6">
          <HistorySidebar drafts={drafts} onSelect={setLoadedDraft} />
        </aside>
      </div>
    </div>
  );
}
