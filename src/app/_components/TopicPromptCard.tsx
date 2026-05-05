"use client";

import { useRouter } from "next/navigation";

interface TopicPromptCardProps {
  topicName: string;
  angles: string[]; // [] = render nothing (silent error/loading state per UI-SPEC)
}

export default function TopicPromptCard({
  topicName,
  angles,
}: TopicPromptCardProps) {
  const router = useRouter();

  // UI-SPEC: Error (silent — no card shown; do not block home screen)
  if (angles.length === 0) return null;

  return (
    <section className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
      <p className="text-xs text-gray-500 mb-1">What to write today</p>
      <p className="text-lg font-semibold text-gray-900 mb-3">{topicName}</p>
      <div className="flex flex-wrap gap-2">
        {angles.map((angle, i) => (
          <button
            key={i}
            onClick={() =>
              router.push(`/?roughIdea=${encodeURIComponent(angle)}`)
            }
            className="text-sm text-gray-700 border border-gray-300 rounded-md px-3 py-2 hover:border-blue-500 hover:text-blue-600 transition-colors min-h-12 text-left"
          >
            {angle}
          </button>
        ))}
      </div>
    </section>
  );
}
