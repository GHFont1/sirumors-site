import type { Metadata } from "next";
import Link from "next/link";
import { companies, momentum, people, series, topics } from "@/lib/data";
import { fmtDate, pct } from "@/lib/format";
import { Section } from "@/components/Blocks";
import { Bars, Sparkline } from "@/components/Charts";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: "AI Trends: Who's Getting the Coverage",
  description: "Daily coverage charts for every AI lab, topic and leader. See who is rising, who is fading, and how much news the race to superintelligence is generating.",
  alternates: { canonical: "/trends/" },
};

function Row({ href, name, logo, kind, slug, round }: { href: string; name: string; logo?: string; kind: "c" | "t" | "p"; slug: string; round?: boolean }) {
  const m = momentum(kind, slug);
  return (
    <Link href={href} className="card flex flex-col gap-2 p-4 hover:border-accent">
      <div className="flex items-center gap-2">
        {kind !== "t" && <Logo slug={logo} name={name} size={22} round={round} />}
        <span className="truncate text-sm font-bold">{name}</span>
        <span className="tabular ml-auto text-sm font-extrabold">{m.last7}</span>
      </div>
      <Sparkline data={series(kind, slug, 60)} height={40} />
      <div className="flex justify-between text-xs text-muted"><span>last 60 days</span><span style={{ color: m.change >= 0 ? "var(--good)" : "var(--bad)" }}>{m.hasBaseline ? `${pct(m.change)} week over week` : "building history"}</span></div>
    </Link>
  );
}

export default function TrendsPage() {
  const total = series("n", null, 30).map((d) => ({ label: fmtDate(d.date, false), value: d.value, tip: fmtDate(d.date) }));
  const byCount = <T extends { slug: string }>(list: T[], kind: "c" | "t" | "p") => [...list].sort((a, b) => momentum(kind, b.slug).last7 - momentum(kind, a.slug).last7);
  return (
    <>
      <div className="kicker">Trends</div>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Who&apos;s getting the coverage</h1>
      <p className="mt-1 max-w-2xl text-muted">Daily story counts across every source we track. Counts are mentions in headlines and summaries, after grouping duplicate coverage. History builds up every day.</p>
      <Section title="Total AI coverage" kicker="Stories per day, last 30 days">
        <div className="card p-4 pt-6"><Bars data={total} label="stories" height={170} tickEvery={5} /></div>
      </Section>
      <Section title="Companies" kicker="Sorted by mentions this week">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {byCount(companies, "c").map((c) => <Row key={c.slug} href={`/c/${c.slug}/`} name={c.name} logo={c.slug} kind="c" slug={c.slug} />)}
        </div>
      </Section>
      <Section title="Topics">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {byCount(topics, "t").map((t) => <Row key={t.slug} href={`/t/${t.slug}/`} name={t.name} kind="t" slug={t.slug} />)}
        </div>
      </Section>
      <Section title="People">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {byCount(people, "p").map((p) => <Row key={p.slug} href={`/people/${p.slug}/`} name={p.name} kind="p" slug={p.slug} round />)}
        </div>
      </Section>
    </>
  );
}
