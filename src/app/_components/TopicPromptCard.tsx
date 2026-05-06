"use client";

interface TopicPromptCardProps {
  topicName: string;
  angles: string[];
  onAngleSelect: (angle: string) => void;
}

export default function TopicPromptCard({
  topicName,
  angles,
  onAngleSelect,
}: TopicPromptCardProps) {
  if (angles.length === 0) return null;

  return (
    <section className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md">
      <p className="text-xs text-gray-500 mb-1">What to write today</p>
      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">{topicName}</p>
      <div className="flex flex-wrap gap-2">
        {angles.map((angle, i) => (
          <button
            key={i}
            onClick={() => onAngleSelect(angle)}
            className="text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors min-h-12 text-left"
          >
            {angle}
          </button>
        ))}
      </div>
    </section>
  );
}
