"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { generateDraft } from "@/app/actions/generate-draft";
import TagRow from "./TagRow";
import type { DraftSummary } from "./HistorySidebar";

type PostFormat = "story_arc" | "hot_take" | "short_insight" | "essay";

interface DraftPanelProps {
  topicAreas?: Array<{ id: number; name: string }>;
  loadedDraft?: DraftSummary | null;
}

export default function DraftPanel({
  topicAreas = [],
  loadedDraft,
}: DraftPanelProps) {
  const [roughIdea, setRoughIdea] = useState("");
  const [format, setFormat] = useState<PostFormat>("short_insight");
  const [draft, setDraft] = useState<string | null>(null);
  const [postId, setPostId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // D-08: clicking a past draft in the sidebar loads it into the main draft area
  useEffect(() => {
    if (!loadedDraft) return;
    setDraft(loadedDraft.draftText ?? "");
    setPostId(loadedDraft.id);
    setRoughIdea(loadedDraft.roughIdea ?? "");
    setError(null);
  }, [loadedDraft]);

  // Phase 3: pre-fill from ?roughIdea= query param (angle button or article card click-to-draft)
  // D-09: no auto-generate — user sees pre-filled textarea and presses Generate manually
  const searchParams = useSearchParams();
  useEffect(() => {
    const seed = searchParams.get("roughIdea");
    if (seed && !loadedDraft) {
      setRoughIdea(seed); // searchParams.get() already URL-decodes the value
    }
  }, []); // intentional empty dep array — run once on mount only

  async function handleGenerate() {
    setIsLoading(true);
    setError(null);
    try {
      const result = await generateDraft(roughIdea, format);
      setDraft(result.draftText);
      setPostId(result.postId);
      setCopied(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopy() {
    if (!draft) return;
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Rough idea textarea */}
      <textarea
        value={roughIdea}
        onChange={(e) => setRoughIdea(e.target.value)}
        placeholder="Drop a rough idea..."
        rows={5}
        maxLength={2000}
        className="w-full border border-gray-300 rounded-md p-3 resize-y text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="flex items-center gap-3">
        {/* Format picker */}
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value as PostFormat)}
          className="border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="story_arc">Story arc</option>
          <option value="hot_take">Hot take</option>
          <option value="short_insight">Short insight</option>
          <option value="essay">Essay</option>
        </select>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={isLoading || roughIdea.trim().length === 0}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
        >
          {isLoading ? "Generating..." : "Generate draft"}
        </button>
      </div>

      {/* Error display */}
      {error && <p className="text-red-600 text-sm">{error}</p>}

      {/* Draft display — appears below the input on the same screen (D-02) */}
      {draft !== null && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-700">
              Generated draft
            </h2>
            <button
              onClick={handleCopy}
              className="text-xs px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div
            data-post-id={postId}
            className="border border-gray-200 rounded-md p-4 bg-gray-50"
          >
            <p className="text-sm whitespace-pre-wrap leading-relaxed">
              {draft}
            </p>
          </div>
          {/* Inline tag row — 5 dropdowns appear as soon as draft is generated (TAGS-05) */}
          {postId && (
            <TagRow
              postId={postId}
              topicAreas={topicAreas}
              initialTags={
                loadedDraft
                  ? {
                      hookType: loadedDraft.hookType,
                      narrativeStructure: loadedDraft.narrativeStructure,
                      topicId: loadedDraft.topicId,
                      scheduledTime: loadedDraft.scheduledTime,
                      status: loadedDraft.status,
                    }
                  : undefined
              }
            />
          )}
        </div>
      )}
    </div>
  );
}
