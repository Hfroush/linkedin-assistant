"use client";

import { useState } from "react";
import { saveBookmark } from "@/app/actions/save-bookmark";

export default function BookmarkForm() {
  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await saveBookmark(url);
      setUrl(""); // clear input on success — feed refresh handled by revalidatePath
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't save bookmark. Try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex gap-3 items-end p-4 bg-gray-50 border border-gray-200 rounded-md"
    >
      <div className="flex flex-col gap-1 flex-1">
        <label className="text-xs text-gray-500">Save a URL as inspiration</label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
      </div>
      <button
        type="submit"
        disabled={isSubmitting || url.trim().length === 0}
        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
      >
        {isSubmitting ? "Saving..." : "Save link"}
      </button>
    </form>
  );
}
