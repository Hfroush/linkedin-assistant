"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { generateDraft } from "@/app/actions/generate-draft";
import { autoTagDraft, type AutoTagResult } from "@/app/actions/auto-tag";
import TagRow from "./TagRow";
import MetricsSection from "./MetricsSection";
import LogPublishedVersionForm from "./LogPublishedVersionForm";
import type { DraftSummary } from "./HistorySidebar";

type PostFormat = "story_arc" | "hot_take" | "short_insight" | "essay";

const FORMAT_OPTIONS: { value: PostFormat; label: string; description: string }[] = [
  { value: "short_insight", label: "Short insight", description: "Punchy, one idea" },
  { value: "hot_take", label: "Hot take", description: "Provocative angle" },
  { value: "story_arc", label: "Story arc", description: "Narrative with a turn" },
  { value: "essay", label: "Essay", description: "Longer, reasoned" },
];

interface DraftPanelProps {
  topicAreas?: Array<{ id: number; name: string }>;
  loadedDraft?: DraftSummary | null;
  seedIdea?: string | null;
  accountId?: number;
}

export default function DraftPanel({
  topicAreas = [],
  loadedDraft,
  seedIdea,
  accountId = 1,
}: DraftPanelProps) {
  const [roughIdea, setRoughIdea] = useState("");
  const [format, setFormat] = useState<PostFormat>("short_insight");
  const [draft, setDraft] = useState<string | null>(null);
  const [postId, setPostId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTagging, setIsTagging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [autoTags, setAutoTags] = useState<AutoTagResult | null>(null);
  const [tagRowKey, setTagRowKey] = useState(0);

  // Load a past draft from the sidebar
  useEffect(() => {
    if (!loadedDraft) return;
    setDraft(loadedDraft.draftText ?? "");
    setPostId(loadedDraft.id);
    setRoughIdea(loadedDraft.roughIdea ?? "");
    setAutoTags(null);
    setError(null);
  }, [loadedDraft]);

  const searchParams = useSearchParams();

  // Pre-fill from sessionStorage (article card → Draft from this)
  useEffect(() => {
    if (loadedDraft) return;
    const stored = sessionStorage.getItem("draftPrefill");
    if (stored) {
      sessionStorage.removeItem("draftPrefill");
      setRoughIdea(stored);
    }
  }, [loadedDraft]);

  // Pre-fill from angle button (seedIdea prop) or legacy ?roughIdea= URL param
  useEffect(() => {
    if (loadedDraft) return;
    if (seedIdea) {
      setRoughIdea(seedIdea);
      return;
    }
    const urlSeed = searchParams.get("roughIdea");
    if (urlSeed) setRoughIdea(urlSeed);
  }, [seedIdea, searchParams, loadedDraft]);

  async function handleGenerate() {
    setIsLoading(true);
    setError(null);
    setAutoTags(null);
    try {
      const result = await generateDraft(roughIdea, format);
      setDraft(result.draftText);
      setPostId(result.postId);
      setCopied(false);

      setIsTagging(true);
      autoTagDraft(result.postId, result.draftText, topicAreas)
        .then((tags) => {
          setAutoTags(tags);
          setTagRowKey((k) => k + 1);
        })
        .catch(() => {})
        .finally(() => setIsTagging(false));
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

  const resolvedTags = loadedDraft
    ? {
        hookType: loadedDraft.hookType,
        narrativeStructure: loadedDraft.narrativeStructure,
        topicId: loadedDraft.topicId,
        scheduledTime: loadedDraft.scheduledTime,
        status: loadedDraft.status,
      }
    : autoTags
    ? {
        hookType: autoTags.hookType,
        narrativeStructure: autoTags.narrativeStructure,
        topicId: autoTags.topicId,
      }
    : undefined;

  const isPublished = loadedDraft?.status === "published";

  return (
    <div className="flex flex-col gap-4">
      <textarea
        value={roughIdea}
        onChange={(e) => setRoughIdea(e.target.value)}
        placeholder="Drop a rough idea..."
        rows={4}
        maxLength={2000}
        className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-3 resize-y text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-transparent dark:text-gray-200 dark:placeholder-gray-500"
      />

      {/* Format picker + Generate */}
      <div className="flex items-center gap-2 flex-wrap">
        {FORMAT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setFormat(opt.value)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              format === opt.value
                ? "bg-gray-900 dark:bg-gray-100 border-gray-900 dark:border-gray-100 text-white dark:text-gray-900"
                : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500"
            }`}
            title={opt.description}
          >
            {opt.label}
          </button>
        ))}

        <button
          onClick={handleGenerate}
          disabled={isLoading || roughIdea.trim().length === 0}
          className="ml-auto px-5 py-1.5 bg-blue-600 text-white text-sm rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
        >
          {isLoading ? "Generating…" : "Generate"}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {draft !== null && (
        <div className="mt-1 flex flex-col gap-2">
          {/* Draft output — distinct visual register */}
          <div className="rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-gray-900 dark:text-gray-100">
              {draft}
            </p>
          </div>

          {/* Copy button */}
          <div className="flex justify-end">
            <button
              onClick={handleCopy}
              className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${
                copied
                  ? "bg-green-600 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {copied ? "Copied!" : "Copy to clipboard"}
            </button>
          </div>

          {/* Tag row */}
          {postId && (
            <div className="relative">
              <TagRow
                key={tagRowKey}
                postId={postId}
                topicAreas={topicAreas}
                initialTags={resolvedTags}
              />
              {isTagging && (
                <p className="text-xs text-gray-400 mt-1">Classifying tags…</p>
              )}
              <LogPublishedVersionForm postId={postId} accountId={accountId} />
            </div>
          )}

          {/* Metrics — only for published posts loaded from sidebar */}
          {isPublished && loadedDraft && (
            <MetricsSection draft={loadedDraft} />
          )}
        </div>
      )}
    </div>
  );
}
