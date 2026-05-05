"use client";

import ArticleCard from "./ArticleCard";

interface FeedItem {
  id: string;
  sourceType: "rss" | "bookmark";
  sourceUrl: string;
  title: string | null;
  summary: string | null;
  topicId: number | null;
  contentHash: string;
  fetchedAt: Date;
  expiresAt: Date | null;
  topicName: string | null;
}

interface ArticleFeedProps {
  items: FeedItem[];
}

export default function ArticleFeed({ items }: ArticleFeedProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-gray-700">No articles yet</p>
        <p className="text-sm text-gray-400">
          Feeds are being fetched. Check back in a moment, or save a URL above.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {items.map((item) => (
        <ArticleCard
          key={item.id}
          title={item.title}
          sourceUrl={item.sourceUrl}
          summary={item.summary}
          topicName={item.topicName}
          fetchedAt={item.fetchedAt}
          sourceType={item.sourceType}
        />
      ))}
    </div>
  );
}
