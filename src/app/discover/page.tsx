import { getTrendingItems } from "@/db/queries";
import { pollFeedsIfStale } from "@/app/actions/poll-feeds";
import ArticleFeed from "../_components/ArticleFeed";
import BookmarkForm from "../_components/BookmarkForm";

export default async function DiscoverPage() {
  // Poll RSS feeds if DB data is stale or empty (DB-TTL gate inside action)
  await pollFeedsIfStale();

  // Read from DB — single source of truth for the feed
  const items = await getTrendingItems();

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        <h1 className="text-xl font-semibold text-gray-900">Inspiration feed</h1>
        <BookmarkForm />
        <ArticleFeed items={items} />
      </div>
    </main>
  );
}
