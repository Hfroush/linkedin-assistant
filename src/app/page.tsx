import { getDrafts, getTopicAreas } from "@/db/queries";
import HomeClient from "./_components/HomeClient";

export default async function Home() {
  const [drafts, topicAreas] = await Promise.all([
    getDrafts(),
    getTopicAreas(),
  ]);
  return (
    <main className="min-h-screen p-6">
      <HomeClient drafts={drafts} topicAreas={topicAreas} />
    </main>
  );
}
