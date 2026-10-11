import type { Metadata } from "next";
import { NOW, resetHistory } from "@/lib/data";
import { LabResets, RESET_LABS, ResetList } from "@/components/Boards";
import { daysBetween } from "@/lib/format";
import { Section, Stat } from "@/components/Blocks";

export const metadata: Metadata = {
  title: "AI Usage Resets: ChatGPT, Codex, Claude, Grok and Gemini Limit Resets",
  description: "When did ChatGPT, Codex, Claude, Grok or Gemini last reset usage limits? Every reset, straight from the labs and their staff on X, checked every 30 minutes.",
  alternates: { canonical: "/resets/" },
};

export default function ResetsPage() {
  const all = resetHistory();
  const done = all.filter((r) => r.status === "done");
  const in30 = done.filter((r) => NOW - Date.parse(r.date) < 30 * 86400000);
  const most = RESET_LABS.map(([slug, product]) => ({ product, n: in30.filter((r) => r.company === slug).length })).sort((a, b) => b.n - a.n)[0];
  const oa = done.filter((r) => r.company === "openai").slice(0, 8);
  const gaps = oa.map((r, i) => (i ? daysBetween(r.date.slice(0, 10), oa[i - 1].date.slice(0, 10)) : null)).filter((x): x is number => x != null && x > 0).sort((a, b) => a - b);
  return (
    <>
      <div className="kicker">Resets</div>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">AI usage resets, <span className="grad-text">every lab</span></h1>
      <p className="mt-1 max-w-2xl text-muted">When ChatGPT and Codex, Claude, Grok or Gemini reset usage limits, straight from the lab or its staff on X. Checked every 30 minutes.</p>

      <div className="mt-6"><LabResets items={all} /></div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Resets, last 30 days" value={in30.length} sub="All labs" tone="accent" />
        <Stat label="Most generous lately" value={most?.n ? most.product : "—"} sub={most?.n ? `${most.n} in 30 days` : ""} />
        <Stat label="Typical Codex gap" value={gaps.length ? `~${gaps[Math.floor(gaps.length / 2)]}d` : "—"} sub="Between recent OpenAI resets" />
      </div>

      <Section title="Every reset" kicker="Newest first">
        <div className="card px-4"><ResetList items={all} limit={100} quotes /></div>
        <p className="mt-2 text-xs text-faint">
          Sources on X: OpenAI&apos;s Tibo (<span className="link-hover">@thsottiaux</span>) and <span className="link-hover">@Codexresets_</span>;
          {" "}Anthropic&apos;s <span className="link-hover">@claudeai</span>, Alex Albert, Thariq, Boris Cherny and Cat Wu;
          {" "}xAI&apos;s <span className="link-hover">@grok</span> and @SpaceXSI;
          {" "}Google&apos;s @GeminiApp, Logan Kilpatrick, Gemini CLI and Antigravity. A reset counts only when one of them posts it.
        </p>
      </Section>
    </>
  );
}
