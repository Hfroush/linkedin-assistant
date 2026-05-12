"use client";

import { useState } from "react";
import { logPublishedVersion } from "@/app/actions/log-published-version";

interface Props {
  postId: string;
  accountId: number;
}

/**
 * Collapsible form for logging the published version of a draft.
 * Rendered in the draft detail view below the draft text.
 * Receives postId (the draft being published) and accountId (active account DB id).
 *
 * page.tsx passes accountId to HomeClient, which passes it to DraftPanel,
 * which passes it here once a draft is visible.
 */
export default function LogPublishedVersionForm({ postId, accountId }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [publishedText, setPublishedText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!publishedText.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await logPublishedVersion({ postId, publishedText, accountId });
      if (result.success) {
        setSubmitted(true);
        setPublishedText("");
        setExpanded(false);
      } else {
        setError("Could not log published version. Try again.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not log published version. Try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <p className="text-xs text-green-600 mt-2">
        Published version logged. Learning engine will analyse the edits.
      </p>
    );
  }

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-xs text-blue-600 hover:underline"
        >
          Log published version
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-2">
          <label className="block text-xs font-medium text-gray-700">
            Paste the text you actually posted on LinkedIn
          </label>
          <textarea
            value={publishedText}
            onChange={(e) => setPublishedText(e.target.value)}
            rows={5}
            maxLength={10000}
            placeholder="Paste the final post text here..."
            className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 resize-y dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={submitting || !publishedText.trim()}
              className="text-xs bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50 hover:bg-blue-700"
            >
              {submitting ? "Saving..." : "Save published version"}
            </button>
            <button
              type="button"
              onClick={() => {
                setExpanded(false);
                setPublishedText("");
                setError(null);
              }}
              className="text-xs text-gray-500 hover:underline"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
