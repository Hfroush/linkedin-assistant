"use client";

import { useState } from "react";
import DraftPanel from "./DraftPanel";
import HistorySidebar from "./HistorySidebar";
import type { DraftSummary } from "./HistorySidebar";

interface HomeClientProps {
  drafts: DraftSummary[];
  topicAreas: Array<{ id: number; name: string }>;
}

export default function HomeClient({ drafts, topicAreas }: HomeClientProps) {
  const [loadedDraft, setLoadedDraft] = useState<DraftSummary | null>(null);

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      <section>
        <h1 className="text-xl font-semibold mb-4">Draft a post</h1>
        <DraftPanel topicAreas={topicAreas} loadedDraft={loadedDraft} />
      </section>
      <aside className="lg:border-l lg:pl-6">
        <HistorySidebar drafts={drafts} onSelect={setLoadedDraft} />
      </aside>
    </div>
  );
}
