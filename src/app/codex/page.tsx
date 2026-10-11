import type { Metadata } from "next";
import { NOW, repos, resetHistory, stories } from "@/lib/data";
import { ResetList } from "@/components/Boards";
import { daysBetween, fmtDate } from "@/lib/format";
import { Section, Stat } from "@/components/Blocks";
import { Bars } from "@/components/Charts";
import { StoryList } from "@/components/Story";
import { TimeAgo } from "@/components/TimeAgo";

export const metadata: Metadata = {
  title: "Codex Tracker: Limit Resets, Releases and News",
  description: "When were Codex usage limits last reset? Every Codex and ChatGPT usage reset, straight from Tibo on X, plus Codex CLI release history and the latest coding-agent news.",
  alternates: { canonical: "/codex/" },
};

function weekly(dates: string[], weeks: number) {
  const out: { label: string; value: number; tip: string }[] = [];
  const end = NOW;
  for (let i = weeks - 1; i >= 0; i--) {
    const a = end - (i + 1) * 7 * 86400000, b = end - i * 7 * 86400000;
    const n = dates.filter((d) => { const t = Date.parse(d); return t >= a && t < b; }).length;
    const label = fmtDate(new Date(a).toISOString(), false);
    out.push({ label, value: n, tip: `week of ${label}` });
  }
  return out;
}
export default function CodexPage() {
  const codexResets = resetHistory().filter((r) => r.status === "done");
  const last = codexResets[0];
  const hours = last ? (NOW - Date.parse(last.date)) / 3600000 : null;
  const gaps = codexResets.slice(0, 8).map((r, i, a) => (i ? daysBetween(r.date, a[i - 1].date) : null)).filter((x): x is number => x != null && x > 0).sort((a, b) => a - b);
  const typicalGap = gaps.length ? gaps[Math.floor(gaps.length / 2)] : null;
  const codex = repos.find((r) => r.repo === "openai/codex");
  const stable = (r?: (typeof repos)[number]) => (r?.releases ?? []).filter((x) => !x.pre && !/alpha|beta|rc/i.test(x.tag));
  const codexStable = stable(codex);
  const latest = codexStable[0];
  const news = stories.filter((s) => /codex|claude code|gemini cli|coding agent/i.test(s.title)).slice(0, 25);
  return (
    <>
      <div className="kicker">Codex tracker</div>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Codex resets, releases and news</h1>
      <p className="mt-1 max-w-2xl text-muted">Every Codex and ChatGPT usage reset, straight from Tibo on X, the Codex CLI&apos;s full release history, and coding-agent news as it breaks.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Last Codex reset" value={hours == null ? "—" : hours < 24 ? `${Math.max(1, Math.round(hours))}h ago` : `${Math.round(hours / 24)}d ago`} sub={last ? `${fmtDate(last.date)} · per Tibo on X` : "None found yet"} tone="accent" />
        <Stat label="Typical gap" value={typicalGap ? `~${typicalGap}d` : "—"} sub="Between recent resets" />
        <Stat label="Codex CLI releases, 30 days" value={codexStable.filter((r) => NOW - Date.parse(r.date) < 30 * 86400000).length} sub={`${codex?.releases.length ?? 0} total incl. pre-releases`} />
        <Stat label="Latest Codex CLI" value={latest ? latest.tag.replace(/^rust-v|^v/, "v") : "—"} sub={latest ? <TimeAgo iso={latest.date} built={NOW} /> : ""} />
      </div>

      <Section title="Reset history" kicker="Every Codex and ChatGPT usage reset">
        <div className="card px-4"><ResetList items={resetHistory()} limit={60} quotes /></div>
        <p className="mt-2 text-xs text-faint">Straight from X: Tibo (<a className="link-hover" href="https://x.com/thsottiaux" target="_blank" rel="noopener noreferrer">@thsottiaux</a>), who runs Codex at OpenAI and posts every reset, and <a className="link-hover" href="https://x.com/Codexresets_" target="_blank" rel="noopener noreferrer">@Codexresets_</a>. Checked every 30 minutes.</p>
      </Section>

      <Section title="Shipping pace" kicker="Stable releases per week, last 26 weeks">
        <div className="grid gap-4 md:grid-cols-3">
          {repos.map((r) => (
            <div key={r.repo} className="card p-4 pt-5">
              <div className="mb-1 flex items-baseline justify-between"><span className="text-sm font-bold">{r.name}</span><a href={`https://github.com/${r.repo}/releases`} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">GitHub ↗</a></div>
              <div className="mb-3 text-xs text-muted">{stable(r).filter((x) => NOW - Date.parse(x.date) < 182 * 86400000).length} stable releases in 6 months</div>
              <Bars data={weekly(stable(r).map((x) => x.date), 26)} label="releases" height={110} tickEvery={6} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Coding-agent news" kicker="Codex, Claude Code and friends" href="/t/codex/">
        <div className="card px-4"><StoryList items={news} /></div>
      </Section>
    </>
  );
}
