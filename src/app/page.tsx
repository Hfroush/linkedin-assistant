import DraftPanel from "./_components/DraftPanel";

export default function Home() {
  return (
    <main className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <section>
          <h1 className="text-xl font-semibold mb-4">Draft a post</h1>
          <DraftPanel />
        </section>
        <aside id="draft-history-sidebar" className="lg:border-l lg:pl-6">
          {/* Plan 04 — history sidebar */}
        </aside>
      </div>
    </main>
  );
}
