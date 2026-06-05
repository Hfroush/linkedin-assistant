"use client";

import { useState } from "react";
import { updateTags } from "@/app/actions/update-tags";

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

interface TagRowProps {
  postId: string;
  topicAreas: Array<{ id: number; name: string }>;
  initialTags?: {
    hookType?: string | null;
    narrativeStructure?: string | null;
    topicId?: number | null;
    scheduledTime?: Date | null;
    status?: "draft" | "published";
  };
}

function toDateTimeLocalValue(value?: Date | string | null): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

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

export default function TagRow({ postId, topicAreas, initialTags }: TagRowProps) {
  const [hookType, setHookType] = useState<HookType | "">(
    (initialTags?.hookType as HookType) ?? ""
  );
  const [narrativeStructure, setNarrativeStructure] = useState<NarrativeStructure | "">(
    (initialTags?.narrativeStructure as NarrativeStructure) ?? ""
  );
  const [topicId, setTopicId] = useState(initialTags?.topicId?.toString() ?? "");
  const [scheduledTime, setScheduledTime] = useState(
    toDateTimeLocalValue(initialTags?.scheduledTime)
  );
  const [status, setStatus] = useState<"draft" | "published">(
    initialTags?.status ?? "draft"
  );

  return (
    <div className="mt-4 flex flex-col gap-4 border-t border-gray-100 dark:border-gray-800 pt-4">
      <PillGroup
        label="Hook type"
        options={HOOK_TYPES}
        value={hookType}
        onChange={(v) => {
          setHookType(v as HookType | "");
          updateTags(postId, { hookType: v || null });
        }}
      />

      <PillGroup
        label="Structure"
        options={NARRATIVE_STRUCTURES}
        value={narrativeStructure}
        onChange={(v) => {
          setNarrativeStructure(v as NarrativeStructure | "");
          updateTags(postId, { narrativeStructure: v || null });
        }}
      />

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Topic</label>
          <select
            value={topicId}
            onChange={(e) => {
              const val = e.target.value;
              setTopicId(val);
              updateTags(postId, { topicId: val ? parseInt(val, 10) : null });
            }}
            className="border border-gray-200 dark:border-gray-700 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 dark:bg-transparent dark:text-gray-300"
          >
            <option value="">— Topic area</option>
            {topicAreas.map((t) => (
              <option key={t.id} value={t.id.toString()}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Schedule</label>
          <input
            type="datetime-local"
            value={scheduledTime}
            onChange={(e) => {
              const val = e.target.value;
              setScheduledTime(val);
              updateTags(postId, { scheduledTime: val ? new Date(val) : null });
            }}
            className="border border-gray-200 dark:border-gray-700 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 dark:bg-transparent dark:text-gray-300"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Status</label>
          {status === "draft" ? (
            <button
              type="button"
              onClick={() => {
                setStatus("published");
                updateTags(postId, { status: "published" });
              }}
              className="px-4 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Mark as published
            </button>
          ) : (
            <span className="text-sm text-green-600 font-medium py-1.5">✓ Published</span>
          )}
        </div>
      </div>
    </div>
  );
}
