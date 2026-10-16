import Link from "next/link";
import { allUpdates } from "@/lib/updates";
import { UpdatesStream } from "@/components/Updates";
import { Sidebar } from "@/components/Sidebar";

// Credit Compound layout: a short header, one list of updates, and a sidebar
// with the few things people come back for.

export default function Home() {
  // Home keeps the signal: releases, resets, lab posts, real rumors and big stories. Whispers and two-outlet stories stay in News.
  const updates = allUpdates(7).filter((u) => u.weight >= 40).slice(0, 60);

  return (
    <>
      <section className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="kicker">Independent AI intelligence</div>
          <h1 className="mt-1 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">AI releases, rumors and resets</h1>
          <p className="mt-2 max-w-xl text-muted">The newest useful changes first, every one written up here in plain words.</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link href="/models/" className="rounded-lg px-4 py-2 text-sm font-bold text-white" style={{ background: "linear-gradient(90deg, var(--accent), var(--accent-2))" }}>Best AI models</Link>
          <Link href="/resets/" className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-bold hover:border-accent">Resets</Link>
          <Link href="/codex/" className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-bold hover:border-accent">Codex reset</Link>
        </div>
      </section>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px] [&>*]:min-w-0">
        <section>
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight">Latest updates</h2>
              <p className="text-sm text-muted">Newest first, last 7 days.</p>
            </div>
            <Link href="/news/" className="shrink-0 text-sm font-semibold text-accent hover:underline">All news →</Link>
          </div>
          <UpdatesStream items={updates} />
        </section>

        <Sidebar />
      </div>
    </>
  );
}
