"use client";

import { useState } from "react";
import { logAdhocPost } from "@/app/actions/log-adhoc-post";

type HookType = "question" | "stat" | "story" | "hot_take" | "confession" | "contrast";
type NarrativeStructure = "hook_insight" | "story_arc" | "essay" | "list";

const HOOK_TYPES: { value: HookType; label: string }[] = [
  { value: "question", label: "Question" },
  { value: "stat", label: "Statistic" },
  { value: "story", label: "Story opener" },
  { value: "hot_take", label: "Hot take" },
  { value: "confession", label: "Confession" },
  { value: "contrast", label: "Contrast" },
];

const NARRATIVE_STRUCTURES: { value: NarrativeStructure; label: string }[] = [
  { value: "hook_insight", label: "Hook + insight" },
  { value: "story_arc", label: "Story arc" },
  { value: "essay", label: "Essay" },
  { value: "list", label: "List" },
];

function PillGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | "";
  onChange: (v: T | "") => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(selected ? "" : opt.value)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                selected
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-300 hover:text-blue-600 dark:hover:text-blue-400"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface AdHocPostFormProps {
  topicAreas: Array<{ id: number; name: string }>;
  accountId: number;
}

export default function AdHocPostForm({ topicAreas, accountId }: AdHocPostFormProps) {
  const [content, setContent] = useState("");
  const [topicId, setTopicId] = useState("");
  const [hookType, setHookType] = useState<HookType | "">("");
  const [narrativeStructure, setNarrativeStructure] = useState<NarrativeStructure | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setContent("");
    setTopicId("");
    setHookType("");
    setNarrativeStructure("");
    setSubmitted(false);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await logAdhocPost({
        content,
        topicId: topicId ? parseInt(topicId, 10) : null,
        hookType: hookType || null,
        narrativeStructure: narrativeStructure || null,
        accountId,
      });
      if (result.success) {
        setSubmitted(true);
      } else {
        setError("Could not save post. Try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save post. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
          <p className="text-sm text-green-700 dark:text-green-400 font-medium">
            Post logged to history.
          </p>
          <p className="text-xs text-green-600 dark:text-green-500 mt-1">
            It&apos;ll appear in the sidebar and count toward topic performance once you add engagement metrics.
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="text-sm text-blue-600 hover:underline self-start"
        >
          Log another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Paste the post you published on LinkedIn..."
        rows={6}
        maxLength={10000}
        className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-3 resize-y text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-transparent dark:text-gray-200 dark:placeholder-gray-500"
      />

      <div className="flex flex-col gap-4 border-t border-gray-100 dark:border-gray-800 pt-4">
        <PillGroup
          label="Hook type"
          options={HOOK_TYPES}
          value={hookType}
          onChange={(v) => setHookType(v as HookType | "")}
        />

        <PillGroup
          label="Structure"
          options={NARRATIVE_STRUCTURES}
          value={narrativeStructure}
          onChange={(v) => setNarrativeStructure(v as NarrativeStructure | "")}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Topic</label>
          <select
            value={topicId}
            onChange={(e) => setTopicId(e.target.value)}
            className="border border-gray-200 dark:border-gray-700 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 dark:bg-transparent dark:text-gray-300 w-fit"
          >
            <option value="">— Topic area</option>
            {topicAreas.map((t) => (
              <option key={t.id} value={t.id.toString()}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div>
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="px-5 py-1.5 bg-blue-600 text-white text-sm rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
        >
          {submitting ? "Saving…" : "Save post"}
        </button>
      </div>
    </form>
  );
}
