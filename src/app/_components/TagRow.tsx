"use client";

import { useState } from "react";
import { updateTags } from "@/app/actions/update-tags";

type HookType =
  | "question"
  | "stat"
  | "story"
  | "hot_take"
  | "confession"
  | "contrast";
type NarrativeStructure = "hook_insight" | "story_arc" | "essay" | "list";

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

export default function TagRow({
  postId,
  topicAreas,
  initialTags,
}: TagRowProps) {
  const [hookType, setHookType] = useState(initialTags?.hookType ?? "");
  const [narrativeStructure, setNarrativeStructure] = useState(
    initialTags?.narrativeStructure ?? ""
  );
  const [topicId, setTopicId] = useState(
    initialTags?.topicId?.toString() ?? ""
  );
  const [scheduledTime, setScheduledTime] = useState("");
  const [status, setStatus] = useState<"draft" | "published">(
    initialTags?.status ?? "draft"
  );

  return (
    <div className="mt-3 flex flex-wrap gap-3 items-end border-t border-gray-100 pt-3">
      {/* Hook type */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500">Hook type</label>
        <select
          value={hookType}
          onChange={(e) => {
            const val = e.target.value as HookType | "";
            setHookType(val);
            updateTags(postId, { hookType: val || null });
          }}
          className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          <option value="">-- Hook type</option>
          <option value="question">Question</option>
          <option value="stat">Statistic</option>
          <option value="story">Story opener</option>
          <option value="hot_take">Hot take</option>
          <option value="confession">Confession</option>
          <option value="contrast">Contrast</option>
        </select>
      </div>

      {/* Narrative structure */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500">Structure</label>
        <select
          value={narrativeStructure}
          onChange={(e) => {
            const val = e.target.value as NarrativeStructure | "";
            setNarrativeStructure(val);
            updateTags(postId, { narrativeStructure: val || null });
          }}
          className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          <option value="">-- Structure</option>
          <option value="hook_insight">Hook + insight</option>
          <option value="story_arc">Story arc</option>
          <option value="essay">Essay</option>
          <option value="list">List</option>
        </select>
      </div>

      {/* Topic area */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500">Topic</label>
        <select
          value={topicId}
          onChange={(e) => {
            const val = e.target.value;
            setTopicId(val);
            updateTags(postId, { topicId: val ? parseInt(val, 10) : null });
          }}
          className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          <option value="">-- Topic area</option>
          {topicAreas.map((t) => (
            <option key={t.id} value={t.id.toString()}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* Scheduled time */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500">Schedule</label>
        <input
          type="datetime-local"
          value={scheduledTime}
          onChange={(e) => {
            const val = e.target.value;
            setScheduledTime(val);
            updateTags(postId, {
              scheduledTime: val ? new Date(val) : null,
            });
          }}
          className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      </div>

      {/* Status */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500">Status</label>
        <select
          value={status}
          onChange={(e) => {
            const val = e.target.value as "draft" | "published";
            setStatus(val);
            updateTags(postId, { status: val });
          }}
          className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>
    </div>
  );
}
