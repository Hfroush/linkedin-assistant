"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveMetrics } from "@/app/actions/save-metrics";
import type { DraftSummary } from "./HistorySidebar";

function MetricField({
  label,
  value,
  onChange,
  onBlur,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  onBlur: () => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</label>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onBlur={onBlur}
        className="w-24 border border-gray-200 dark:border-gray-700 rounded-md px-2.5 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-400 dark:bg-transparent dark:text-gray-300"
      />
    </div>
  );
}

export default function MetricsSection({ draft }: { draft: DraftSummary }) {
  const router = useRouter();
  const [reactions, setReactions] = useState(draft.reactions ?? 0);
  const [comments, setComments] = useState(draft.comments ?? 0);
  const [reposts, setReposts] = useState(draft.reposts ?? 0);
  const [impressions, setImpressions] = useState(draft.impressions ?? 0);
  const [saving, setSaving] = useState(false);

  const liveRate =
    impressions > 0
      ? ((reactions + comments + reposts) / impressions) * 100
      : null;

  async function handleBlur() {
    setSaving(true);
    await saveMetrics({ postId: draft.id, reactions, comments, reposts, impressions });
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="mt-6 border-t border-gray-100 dark:border-gray-800 pt-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Performance</h3>
        <div className="flex items-center gap-3">
          {liveRate != null && (
            <span className="text-sm font-semibold text-blue-600">
              {liveRate.toFixed(1)}% engagement
            </span>
          )}
          {saving && <span className="text-xs text-gray-400">saving…</span>}
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <MetricField label="Reactions" value={reactions} onChange={setReactions} onBlur={handleBlur} />
        <MetricField label="Comments" value={comments} onChange={setComments} onBlur={handleBlur} />
        <MetricField label="Reposts" value={reposts} onChange={setReposts} onBlur={handleBlur} />
        <MetricField label="Impressions" value={impressions} onChange={setImpressions} onBlur={handleBlur} />
      </div>
    </div>
  );
}
