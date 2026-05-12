"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { generateDraft } from "@/app/actions/generate-draft";
import { autoTagDraft, type AutoTagResult } from "@/app/actions/auto-tag";
import TagRow from "./TagRow";
import LogPublishedVersionForm from "./LogPublishedVersionForm";
import type { DraftSummary } from "./HistorySidebar";

type PostFormat = "story_arc" | "hot_take" | "short_insight" | "essay";

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
  // Incrementing key forces TagRow to remount when auto-tags arrive
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

      // Auto-tag in background — draft is already visible, tags fill in after
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

  // Resolve which tags to show: loaded draft tags > auto-tags > nothing
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

  return (
    <div className="flex flex-col gap-4">
      <textarea
        value={roughIdea}
        onChange={(e) => setRoughIdea(e.target.value)}
        placeholder="Drop a rough idea..."
        rows={5}
        maxLength={2000}
        className="w-full border border-gray-300 rounded-md p-3 resize-y text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="flex items-center gap-3">
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

        <button
          onClick={handleGenerate}
          disabled={isLoading || roughIdea.trim().length === 0}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
        >
          {isLoading ? "Generating..." : "Generate draft"}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {draft !== null && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Generated draft
            </h2>
            <button
              onClick={handleCopy}
              className="text-xs px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-300 transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div
            data-post-id={postId}
            className="border border-gray-200 dark:border-gray-700 rounded-md p-4 bg-white dark:bg-gray-900"
          >
            <p className="text-sm whitespace-pre-wrap leading-relaxed text-gray-900 dark:text-gray-100">
              {draft}
            </p>
          </div>

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
        </div>
      )}
    </div>
  );
}
