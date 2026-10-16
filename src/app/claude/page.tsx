import type { Metadata } from "next";
import { resetSnippet } from "@/lib/resetSeo";
import { ResetQuestions, ResetStatus } from "@/components/ResetAnswers";
import { NOW, allReleases, repos, resetHistory, storiesFor } from "@/lib/data";
import { ReleaseFeed, ResetList } from "@/components/Boards";
import { fmtDate } from "@/lib/format";
import { Section, Stat } from "@/components/Blocks";
import { StoryList } from "@/components/Story";
import { TimeAgo } from "@/components/TimeAgo";

const snippet = resetSnippet("claude");
export const metadata: Metadata = {
  title: { absolute: snippet.title },
  description: snippet.description,
  alternates: { canonical: "/claude/" },
};

export default function ClaudePage() {
  const resets = resetHistory("anthropic");
  const last = resets.find((r) => r.status === "done");
  const cc = repos.find((r) => r.repo === "anthropics/claude-code");
  const ccStable = (cc?.releases ?? []).filter((x) => !x.pre && !/alpha|beta|rc/i.test(x.tag));
  const latestCC = ccStable[0];
  const models = allReleases().filter((r) => r.company === "anthropic");
  const news = storiesFor({ company: "anthropic" }).slice(0, 25);
  return (
    <>
      <div className="kicker">Claude tracker</div>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Claude usage limit resets and Claude Code tracker</h1>
      <p className="mt-1 max-w-2xl text-muted">Every time Anthropic resets Claude usage limits for everyone, every Claude Code release, every Claude model and the Claude news that matters. Checked every 30 minutes.</p>
      <ResetStatus lab="anthropic" name="Claude" />

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Last Claude reset" value={last ? fmtDate(last.date, false) : "—"} sub={last ? `${fmtDate(last.date)} · ${last.banked ? "banked reset" : "full reset"}` : "None found yet"} tone="accent" />
        <Stat label="Latest Claude model" value={models[0]?.name ?? "—"} sub={models[0] ? fmtDate(models[0].date) : ""} />
        <Stat label="Claude Code releases, 30 days" value={ccStable.filter((r) => NOW - Date.parse(r.date) < 30 * 86400000).length} sub="Stable versions" />
        <Stat label="Latest Claude Code" value={latestCC ? latestCC.tag.replace(/^v?/, "v") : "—"} sub={latestCC ? <TimeAgo iso={latestCC.date} built={NOW} /> : ""} />
      </div>

      <Section title="Reset history" kicker="Every Claude usage reset Anthropic announced">
        <div className="card px-4"><ResetList items={resets} limit={30} quotes /></div>
        <p className="mt-2 text-xs text-faint">A reset counts only when Anthropic (<span className="link-hover">@claudeai</span>) or its staff post it on X. Codex resets are on the <a className="link-hover text-accent" href="/codex/">Codex tracker</a>; every lab is on the <a className="link-hover text-accent" href="/resets/">resets page</a>.</p>
      </Section>

      <Section title="Claude models" kicker="Every Opus, Sonnet and Haiku release" href="/releases/">
        <div className="card px-4"><ReleaseFeed items={models} limit={12} /></div>
      </Section>

      <Section title="Claude news" kicker="Only what matters" href="/c/anthropic/">
        <div className="card px-4"><StoryList items={news} /></div>
      </Section>

      <ResetQuestions lab="anthropic" name="Claude" />
    </>
  );
}
