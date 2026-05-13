"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { generateDraft } from "@/app/actions/generate-draft";
import { autoTagDraft, type AutoTagResult } from "@/app/actions/auto-tag";
import {
  getDraftVersionHistory,
  reviseDraft,
  saveEditedDraft,
} from "@/app/actions/draft-workflow";
import TagRow from "./TagRow";
import type { DraftSummary } from "./HistorySidebar";

type PostFormat = "story_arc" | "hot_take" | "short_insight" | "essay";
type RevisionMode = "sharper" | "shorter" | "more_voice" | "rewrite_opening" | "hooks";

type DraftVersion = {
  id: string;
  postId: string;
  draftText: string;
  label: string;
  createdAt: string;
};

interface DraftPanelProps {
  topicAreas?: Array<{ id: number; name: string }>;
  loadedDraft?: DraftSummary | null;
  seedIdea?: string | null;
}

export default function DraftPanel({
  topicAreas = [],
  loadedDraft,
  seedIdea,
}: DraftPanelProps) {
  const [roughIdea, setRoughIdea] = useState("");
  const [format, setFormat] = useState<PostFormat>("short_insight");
  const [draft, setDraft] = useState<string | null>(null);
  const [postId, setPostId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTagging, setIsTagging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [revisionMode, setRevisionMode] = useState<RevisionMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [autoTags, setAutoTags] = useState<AutoTagResult | null>(null);
  const [versions, setVersions] = useState<DraftVersion[]>([]);
  const [hookOptions, setHookOptions] = useState<string | null>(null);
  // Incrementing key forces TagRow to remount when auto-tags arrive
  const [tagRowKey, setTagRowKey] = useState(0);

  // Load a past draft from the sidebar
  useEffect(() => {
    if (!loadedDraft) return;
    setDraft(loadedDraft.finalText ?? loadedDraft.draftText ?? "");
    setPostId(loadedDraft.id);
    setRoughIdea(loadedDraft.roughIdea ?? "");
    setAutoTags(null);
    setHookOptions(null);
    setVersions([]);
    setError(null);
  }, [loadedDraft]);

  useEffect(() => {
    if (!postId) {
      setVersions([]);
      return;
    }

    let cancelled = false;
    getDraftVersionHistory(postId)
      .then((history) => {
        if (!cancelled) setVersions(history);
      })
      .catch(() => {
        if (!cancelled) setVersions([]);
      });

    return () => {
      cancelled = true;
    };
  }, [postId]);

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
      setHookOptions(null);

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

  async function handleSave(saveAsFinal = false) {
    if (!postId || !draft) return;
    setIsSaving(true);
    setError(null);
    try {
      await saveEditedDraft({ postId, draftText: draft, saveAsFinal });
      const history = await getDraftVersionHistory(postId);
      setVersions(history);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRevise(mode: RevisionMode) {
    if (!postId || !draft) return;
    setRevisionMode(mode);
    setError(null);
    try {
      const result = await reviseDraft({ postId, draftText: draft, mode });
      if (mode === "hooks") {
        setHookOptions(result.draftText);
      } else {
        setDraft(result.draftText);
        setHookOptions(null);
        const history = await getDraftVersionHistory(postId);
        setVersions(history);
      }
      setCopied(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revision failed");
    } finally {
      setRevisionMode(null);
    }
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
              Draft workspace
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSave(false)}
                disabled={!postId || isSaving}
                className="text-xs px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-300 transition-colors disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save edit"}
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={!postId || isSaving}
                className="text-xs px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-300 transition-colors disabled:opacity-50"
              >
                Save final
              </button>
              <button
                onClick={handleCopy}
                className="text-xs px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-300 transition-colors"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
          <textarea
            data-post-id={postId}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={12}
            className="w-full border border-gray-200 dark:border-gray-700 rounded-md p-4 bg-white dark:bg-gray-900 text-sm leading-relaxed text-gray-900 dark:text-gray-100 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {([
              ["sharper", "Make sharper"],
              ["shorter", "Shorten"],
              ["more_voice", "More Houtan"],
              ["rewrite_opening", "Rewrite opening"],
              ["hooks", "5 hooks"],
            ] as const).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => handleRevise(mode)}
                disabled={!postId || revisionMode !== null}
                className="text-xs px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                {revisionMode === mode ? "Working..." : label}
              </button>
            ))}
          </div>

          {hookOptions && (
            <div className="mt-3 rounded-md border border-blue-100 bg-blue-50 p-3">
              <p className="text-xs font-semibold text-blue-900 mb-2">Hook options</p>
              <p className="text-sm whitespace-pre-wrap text-blue-950">{hookOptions}</p>
            </div>
          )}

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
            </div>
          )}

          {versions.length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Version history
              </h3>
              <div className="flex flex-col gap-2">
                {versions.slice(0, 6).map((version) => (
                  <button
                    key={version.id}
                    onClick={() => {
                      setDraft(version.draftText);
                      setHookOptions(null);
                    }}
                    className="text-left rounded-md border border-gray-200 px-3 py-2 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {version.label}
                      </span>
                      <span className="shrink-0 text-xs text-gray-400">
                        {new Date(version.createdAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <span className="mt-1 block text-xs text-gray-400 line-clamp-1">
                      {version.draftText}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
