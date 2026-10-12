import type { Metadata } from "next";
import { meta } from "@/lib/data";
import sources from "../../../config/sources.json";
import { Section } from "@/components/Blocks";
import { TimeAgo } from "@/components/TimeAgo";
import { NOW } from "@/lib/data";

export const metadata: Metadata = {
  title: "About SI Rumors and Our Sources",
  description: "How SI Rumors works: the sources we track, how rumors are scored, how release estimates are made, and how often everything updates.",
  alternates: { canonical: "/about/" },
};

export default function AboutPage() {
  const health = meta.health ?? {};
  const rows = Object.entries(health).sort((a, b) => (a[1].name ?? a[0]).localeCompare(b[1].name ?? b[0]));
  return (
    <div className="max-w-3xl">
      <div className="kicker">About</div>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">The go-to spot for the road to superintelligence</h1>
      <p className="mt-3 text-lg text-muted">SI Rumors tracks every frontier AI lab, the people running them, and the things they build, from models to humanoid robots and robotaxis. SI stands for superintelligence.</p>
      <Section title="How it works">
        <div className="card space-y-3 p-5 text-[15px] leading-relaxed text-muted">
          <p><span className="font-semibold text-text">Updated every 30 minutes.</span> We watch the labs' own blogs and X accounts and the major news outlets around the clock. Last update: <TimeAgo iso={meta.lastUpdated ?? new Date(NOW).toISOString()} built={NOW} />.</p>
          <p><span className="font-semibold text-text">Only what matters.</span> A story makes SI Rumors when a lab announces something itself, when major outlets (Reuters, Bloomberg, The Verge, the FT and the like) carry it, or when it is a big government move. Commentary, hot takes and minor posts stay off. Every story is researched and written here, in our own words.</p>
          <p><span className="font-semibold text-text">Rumors are rated.</span> Leaks get a confidence score from how many independent outlets report them and their track record, and flip to Confirmed when the lab makes it official. A score measures how widely and credibly something is reported, not whether it is true.</p>
          <p><span className="font-semibold text-text">Release estimates are math, not leaks.</span> A release counts only when the company announces it itself, on its blog or its own X account. The next date is the last release plus the median gap between that line&apos;s recent releases.</p>
          <p><span className="font-semibold text-text">Resets</span> come straight from X: the labs&apos; own accounts and the staff who announce resets (OpenAI&apos;s Tibo, Anthropic&apos;s Claude team, xAI&apos;s Grok account, Google&apos;s Gemini team), plus the @Codexresets_ tracker. Older Codex resets were checked against the Codex Resets history (codex-resets.com), and each one confirmed from Tibo's own post. A reset counts only when one of them posts it.</p>
        </div>
      </Section>
    </div>
  );
}
