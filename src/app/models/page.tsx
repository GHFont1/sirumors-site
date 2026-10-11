import type { Metadata } from "next";
import Link from "next/link";
import { boardsPublished, companyBySlug, frontier } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: "Best Frontier AI Models Right Now, Ranked",
  description: "One ranked list of the best frontier AI models, from Claude and GPT to Gemini and Grok, by their placing on Arena's overall, hard-problem, coding and agent leaderboards.",
  alternates: { canonical: "/models/" },
};

const COLS: [string, string][] = [["overall", "Overall"], ["hard", "Hard"], ["coding", "Coding"], ["agent", "Agents"]];

export default function ModelsPage() {
  return (
    <>
      <div className="kicker">SI Rankings</div>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Best frontier models <span className="grad-text">right now</span></h1>
      <p className="mt-1 max-w-2xl text-muted">One list, in order. Each model&apos;s score is its average placing on Arena&apos;s overall, hard-problem, coding and agent boards (100 = #1 everywhere). Tap a model for its reference page.</p>
      {!frontier.length && <p className="card mt-6 p-6 text-sm text-muted">Rankings are loading. Check back shortly.</p>}
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-muted">
              <th className="p-3 w-10">#</th><th className="p-3">Model</th><th className="p-3 text-right">Score</th>
              {COLS.map(([id, label]) => <th key={id} className="hidden p-3 text-right sm:table-cell">{label}</th>)}
            </tr>
          </thead>
          <tbody>
            {frontier.map((m) => {
              const co = m.company ? companyBySlug(m.company) : undefined;
              return (
                <tr key={m.slug} className="border-b border-line last:border-0 hover:bg-chip">
                  <td className="tabular p-3 font-extrabold" style={m.rank === 1 ? { color: "var(--accent-2)" } : undefined}>{m.rank}</td>
                  <td className="p-3">
                    <Link href={`/models/${m.slug}/`} className="flex items-center gap-2.5">
                      <Logo slug={co?.slug} name={m.orgName} size={24} />
                      <span className="min-w-0">
                        <span className="block font-bold link-hover">{m.rank === 1 ? "👑 " : ""}{m.model}</span>
                        <span className="block text-[11px] text-muted">{co?.name ?? m.orgName}{m.open ? " · open weights" : ""}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="tabular p-3 text-right font-extrabold">{Math.round(m.score)}</td>
                  {COLS.map(([id]) => <td key={id} className="tabular hidden p-3 text-right text-muted sm:table-cell">{m.boards[id] ? `#${m.boards[id].pos}` : "—"}</td>)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-faint">Source: Arena (arena.ai) public leaderboards{boardsPublished ? `, published ${fmtDate(boardsPublished)}` : ""}. A model must be on at least two of the four boards. &ldquo;—&rdquo; means it isn&apos;t on that board, so it&apos;s judged on the rest.</p>
    </>
  );
}
