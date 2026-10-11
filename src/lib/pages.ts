import { NOW, allReleases, companyBySlug, pageId, releaseLines, resetHistory, rumors, stories, videos, type Story } from "./data";
import { allUpdates, cleanTitle } from "./updates";
import { daysBetween, fmtDate } from "./format";

// One page on our own site for every story, release, reset, tool update and video,
// so nothing a reader clicks leaves sirumors.com.

export type PageItem = {
  id: string;
  kind: "story" | "rumor" | "release" | "reset" | "update" | "video";
  badge: string;
  headline: string;
  dek?: string;
  body: string[];
  date: string;
  company?: string;
  companies: string[];
  topics: string[];
  people: string[];
  image?: string;
  /** Outlets that reported it, as names only. */
  outlets: string[];
  facts: [string, string][];
  quote?: { text: string; by: string };
  story?: Story;
  youtubeId?: string;
  ours: boolean;
};

const sentences = (t: string) => t.replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s+(?=[A-Z“"])/).filter(Boolean);
/** Feed text as short paragraphs, minus "Read more", "The post ... appeared first on" and the like. */
function paras(t?: string) {
  if (!t) return [];
  const clean = t.replace(/The post .* appeared first on .*$/i, "").replace(/\b(Read more|Continue reading|Click here)\b.*$/i, "").replace(/\[…\]|\[\.\.\.\]/g, "…").trim();
  const s = sentences(clean);
  const out: string[] = [];
  for (let i = 0; i < s.length; i += 2) out.push(s.slice(i, i + 2).join(" "));
  return out.slice(0, 4);
}

function storyItem(s: Story): PageItem {
  const outlets = [...new Set([s.source, ...(s.cluster ?? []).map((c) => c.source)])];
  const rumor = s.isRumor && s.status;
  const badge = rumor ? ({ confirmed: "Confirmed", strong: "Strong rumor", developing: "Rumor", whisper: "Whisper" } as const)[s.status!] : s.type === "official" ? "Official" : (s.sourceCount ?? 1) >= 3 ? "Big story" : "News";
  const facts: [string, string][] = [["Published", fmtDate(s.publishedAt)]];
  if (outlets.length > 1) facts.push(["Reported by", `${outlets.length} outlets`]);
  if (rumor) facts.push(["Confidence", `${s.confidence ?? 0}/100`]);
  if (s.type === "official") facts.push(["Source", "The company itself"]);
  if (s.points) facts.push(["Hacker News", `${s.points} points`]);
  return {
    id: `s-${s.id}`, kind: rumor ? "rumor" : "story", badge,
    headline: s.body ? s.title : cleanTitle(s.title, s.source),
    dek: s.body ? s.summary : undefined,
    body: s.body ?? (() => {
      // Feeds often repeat the title as the summary; say who reported it instead.
      const b = paras(s.summary).filter((t) => !t.toLowerCase().startsWith(cleanTitle(s.title, s.source).toLowerCase().slice(0, 40)));
      return b.length ? b : [`${outlets.length > 1 ? `${outlets.slice(0, -1).join(", ")} and ${outlets[outlets.length - 1]} reported` : `${outlets[0]} reported`} this on ${fmtDate(s.publishedAt)}.${rumor ? " It has not been confirmed by the company." : ""}`];
    })(),
    date: s.publishedAt, company: s.companies[0], companies: s.companies, topics: s.topics, people: s.people,
    image: s.image, outlets, facts, story: s, ours: !!s.body,
  };
}

let cache: PageItem[] | null = null;

export function pageItems(): PageItem[] {
  if (cache) return cache;
  const out: PageItem[] = [];
  const seen = new Set<string>();
  for (const s of [...stories, ...rumors]) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    out.push(storyItem(s));
  }

  // Releases: our own text from the release record.
  for (const r of allReleases()) {
    const line = releaseLines.find((l) => l.id === r.line)!;
    const co = companyBySlug(r.company);
    const i = line.releases.findIndex((x) => x.version === r.version && x.date === r.date);
    const prev = line.releases[i - 1];
    const next = line.releases[i + 1];
    const gap = prev ? daysBetween(prev.date, r.date) : null;
    const body = [
      `${co?.name ?? r.company} released ${r.name} on ${fmtDate(r.date)}.${r.source === "official" && r.evidence ? ` The company announced it itself (${r.evidence.source}).` : ""}`,
      prev ? `It follows ${prev.name}, ${gap} days earlier.${line.medianGapDays && line.releases.length >= 4 ? ` Releases in the ${line.name} line usually land about ${line.medianGapDays} days apart.` : ""}` : `It is the first release we track in the ${line.name} line.`,
      next ? `${next.name} replaced it on ${fmtDate(next.date)}.` : line.expectedNext ? `Based on that pace, the next ${line.name} release is expected around ${fmtDate(line.expectedNext)}. That is our estimate, not a leak.` : "",
    ].filter(Boolean);
    out.push({
      id: `r-${r.line}-${r.version}`, kind: "release", badge: "Released", headline: `${r.name} is out`,
      dek: `${co?.name ?? r.company} shipped ${r.name}.`, body, date: r.date, company: r.company, companies: [r.company], topics: ["models"], people: [],
      outlets: r.evidence ? [r.evidence.source] : [], ours: true,
      quote: r.evidence && r.source === "official" ? { text: r.evidence.title, by: r.evidence.source } : undefined,
      facts: [["Released", fmtDate(r.date)], ["Line", line.name], ...(prev ? [["Previous", `${prev.name} (${fmtDate(prev.date)})`] as [string, string]] : []), ["Confirmed by", r.source === "official" ? "The company's own announcement" : r.source === "seed" ? "Historical record" : "News reports"]],
    });
  }

  // Resets: our own text from the reset record.
  const resets = resetHistory();
  for (const r of resets) {
    const prev = resets.find((x) => x.company === r.company && x.date < r.date);
    const gap = prev ? daysBetween(prev.date.slice(0, 10), r.date.slice(0, 10)) : null;
    const by = r.byName ?? (r.by === "thsottiaux" ? "Tibo" : `@${r.by}`);
    out.push({
      id: r.id, kind: "reset", badge: r.status === "coming" ? "Reset coming" : r.banked ? "Banked reset" : "Reset",
      headline: r.title, dek: `${r.product} usage limits${r.status === "coming" ? " are about to reset" : " were reset"}${r.banked ? ", as a reset you can save and use later" : ""}.`,
      body: [
        `${by} posted on X on ${fmtDate(r.date)}${r.status === "coming" ? " that a reset is on the way" : " that usage limits were reset"}${r.banked ? ". This one is banked: subscribers can keep it and use it when they want" : ""}.`,
        prev ? `The last ${r.product} reset before this was on ${fmtDate(prev.date)}, ${gap === 0 ? "the same day" : `${gap} days earlier`}.` : `This is the first ${r.product} reset we have on record.`,
      ],
      date: r.date, company: r.company, companies: [r.company], topics: ["codex"], people: [], outlets: [`${by} on X`], ours: true,
      quote: { text: r.quote, by: `${by} on X` },
      facts: [["Date", fmtDate(r.date)], ["Product", r.product], ["Type", r.banked ? "Banked reset" : "Full reset"], ...(gap != null ? [["Since last reset", `${gap} days`] as [string, string]] : [])],
    });
  }

  // Tool versions (Codex CLI, Claude Code, Gemini CLI).
  for (const u of allUpdates(30).filter((u) => u.kind === "update")) {
    out.push({
      id: u.id, kind: "update", badge: "Update", headline: u.headline, dek: u.summary, body: [`${u.headline.replace(/ is out$/, "")} was published on ${fmtDate(u.date)}. It is a stable release, not a preview.`],
      date: u.date, company: u.company, companies: u.companies, topics: u.topics, people: [], outlets: [], ours: true, facts: [["Published", fmtDate(u.date)]],
    });
  }

  // Videos play right on the page.
  for (const v of videos) {
    out.push({
      id: `v-${v.id}`, kind: "video", badge: v.channelType === "official" ? "Official video" : "Video", headline: v.title,
      body: [`${v.channel} posted this video on ${fmtDate(v.publishedAt)}${v.views ? `. It has ${v.views.toLocaleString("en-US")} views so far` : ""}.`],
      date: v.publishedAt, company: v.companies[0], companies: v.companies, topics: v.topics, people: v.people, outlets: [v.channel], image: v.thumb,
      youtubeId: v.youtubeId ?? v.id, ours: true, facts: [["Channel", v.channel], ["Posted", fmtDate(v.publishedAt)]],
    });
  }

  const ids = new Set<string>();
  cache = out.filter((p) => { const k = pageId(p.id); if (ids.has(k)) return false; ids.add(k); return true; });
  return cache;
}

export const pageById = (id: string) => pageItems().find((p) => pageId(p.id) === id);

/** Other notable pages about the same company (releases, resets, rumors and stories the update feed carries), closest in time first. */
export function related(p: PageItem, n = 6) {
  const co = p.company;
  const notable = new Set(allUpdates(30).map((u) => u.id));
  return pageItems()
    .filter((x) => x.id !== p.id && (notable.has(x.id) || x.kind === "release" || x.kind === "reset") && co && x.companies.includes(co) && Math.abs(Date.parse(x.date) - Date.parse(p.date)) < 30 * 86400000)
    .sort((a, b) => Math.abs(Date.parse(a.date) - Date.parse(p.date)) - Math.abs(Date.parse(b.date) - Date.parse(p.date)))
    .slice(0, n);
}

export const isFresh = (p: PageItem) => NOW - Date.parse(p.date) < 2 * 86400000;
