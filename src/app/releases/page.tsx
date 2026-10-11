import type { Metadata } from "next";
import Link from "next/link";
import { NOW, allReleases, companyBySlug, releaseLines, upcoming } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { NextUpCard, Section } from "@/components/Blocks";
import { Bars, ReleaseTimeline } from "@/components/Charts";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: "AI Release Tracker: History and Next Expected Launch",
  description: "Every GPT, Claude, Gemini, Grok, Llama and DeepSeek release on one timeline, plus Optimus, Figure and robotaxis, with the next launch estimated from each lab's pace.",
  alternates: { canonical: "/releases/" },
};

export default function ReleasesPage() {
  const next = upcoming();
  const all = allReleases();
  const quarters: { label: string; value: number; tip: string }[] = [];
  const start = new Date(NOW); start.setUTCMonth(Math.floor(start.getUTCMonth() / 3) * 3 - 3 * 11, 1);
  for (let i = 0; i < 12; i++) {
    const q0 = new Date(start); q0.setUTCMonth(start.getUTCMonth() + i * 3);
    const q1 = new Date(q0); q1.setUTCMonth(q0.getUTCMonth() + 3);
    const a = q0.toISOString().slice(0, 10), b = q1.toISOString().slice(0, 10);
    const n = all.filter((r) => r.date >= a && r.date < b && releaseLines.find((l) => l.id === r.line)?.kind === "model").length;
    const qn = Math.floor(q0.getUTCMonth() / 3) + 1;
    quarters.push({ label: `Q${qn} ’${String(q0.getUTCFullYear()).slice(2)}`, value: n, tip: `Q${qn} ${q0.getUTCFullYear()}${i === 11 ? " (so far)" : ""}` });
  }
  const stale = releaseLines.filter((l) => l.stale && !l.retired);
  return (
    <>
      <div className="kicker">Release tracker</div>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Every launch, and when the next one lands</h1>
      <p className="mt-1 max-w-2xl text-muted">Release dates come from each lab&apos;s own announcements, with news coverage for labs that don&apos;t publish a feed. Expected-next dates use the median gap between a line&apos;s recent releases. They are estimates, not leaks.</p>

      <Section title="Next up" kicker="Estimated next release">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {next.map((l) => <NextUpCard key={l.id} l={l} />)}
        </div>
        {stale.length > 0 && (
          <p className="mt-3 text-xs text-muted">
            No new release detected lately for {stale.map((l, i) => <span key={l.id}>{i ? ", " : ""}<span className="font-semibold">{l.name}</span> (last {fmtDate(l.lastRelease!)})</span>)}. We&apos;ll add the next one when it ships.
          </p>
        )}
      </Section>

      <Section title="Timeline" kicker="All product lines, last 3 years">
        <div className="card p-4">
          <ReleaseTimeline
            lines={releaseLines.map((l) => ({ ...l, href: `/c/${l.company}/` }))}
            from={new Date(NOW - 3 * 365 * 86400000).toISOString().slice(0, 10)}
            to={new Date(NOW + 200 * 86400000).toISOString().slice(0, 10)}
            now={new Date(NOW).toISOString().slice(0, 10)}
          />
        </div>
      </Section>

      <Section title="Frontier model releases per quarter" kicker="The pace is accelerating">
        <div className="card p-4 pt-6"><Bars data={quarters} label="releases" height={180} /></div>
      </Section>

      <Section title="Release log">
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted"><th className="px-4 py-2.5">Date</th><th className="px-4 py-2.5">Release</th><th className="px-4 py-2.5">Line</th><th className="px-4 py-2.5">Source</th></tr></thead>
            <tbody>
              {all.map((r) => {
                const c = companyBySlug(r.company);
                return (
                  <tr key={r.line + r.version + r.date} className="border-b border-line last:border-b-0">
                    <td className="tabular whitespace-nowrap px-4 py-2.5 text-muted">{fmtDate(r.date)}</td>
                    <td className="px-4 py-2.5 font-semibold">{r.name}</td>
                    <td className="px-4 py-2.5"><Link href={`/c/${r.company}/`} className="inline-flex items-center gap-1.5 hover:text-accent"><Logo slug={r.company} name={c?.name ?? r.lineName} size={16} /> {r.lineName}</Link></td>
                    <td className="px-4 py-2.5 text-xs text-muted">
                      {r.evidence ? <a href={r.evidence.url} target="_blank" rel="noopener noreferrer" className="hover:text-accent">{r.source === "official" ? <><span style={{ color: "var(--good)" }}>✓</span> {r.evidence.source}</> : `Reported by ${r.evidence.source}`} ↗</a> : "Historical record"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
