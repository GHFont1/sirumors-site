import { NOW, companyBySlug, releaseLines, repos, resets, stories, videos, type Filter, type Story } from "./data";

// The Updates stream: the handful of things that actually happened, each with
// a type badge. Plain single-source articles stay in /news.

export type UpdateKind = "release" | "breaking" | "rumor" | "official" | "reset" | "update" | "hot" | "video";

export type Update = {
  id: string;
  kind: UpdateKind;
  badge: string;
  headline: string;
  summary?: string;
  url: string;
  date: string;
  company?: string;
  companies: string[];
  topics: string[];
  people: string[];
  source: string;
  sources: number;
  image?: string;
  confidence?: number;
  status?: Story["status"];
  points?: number;
  discuss: string;
  weight: number;
};

export const KIND_LABEL: Record<UpdateKind, string> = {
  release: "Releases",
  breaking: "Breaking",
  rumor: "Rumors",
  official: "From the labs",
  reset: "Codex resets",
  update: "Version updates",
  hot: "Hot",
  video: "Videos",
};

const LABS = new Set(["openai", "anthropic", "google", "xai", "meta", "deepseek", "mistral", "microsoft", "nvidia", "tesla", "figure", "apple", "amazon"]);
// Customer case studies, gaming and marketing posts from official blogs are not updates.
const OFFICIAL_NOISE = /\b(cuts?|halves|saves?|turns?|helps?|powers?)\b.*\b(with|using|into)\b|\bhow .+ (uses?|built|turns?)\b|customer stor|case study|geforce now|gaming|gears of war|\bmyths?\b|webinar|\bevent recap\b|into the omniverse/i;

const STOP = new Set("the and for with from that this into over amid after about says said will have has are was its their than more most what when where which while your reportedly report reports new ai how why who".split(" "));
const COMMON = new Set(["ai", "the", "a", "an", "how", "why", "what", "is", "new", "massive", "leak", "report", "exclusive", "breaking"]);
// Crude stems (first 5 letters) so "catastrophe" and "catastrophic" match.
const words = (t: string) => new Set(t.toLowerCase().replace(/[^a-z0-9.\s]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)).map((w) => w.slice(0, 5)));
const names = (t: string) => new Set((t.match(/\b[A-Z][A-Za-z0-9.]+\b/g) ?? []).map((w) => w.toLowerCase()).filter((w) => !COMMON.has(w)));
type Sig = { w: Set<string>; n: Set<string> };
const sig = (t: string): Sig => ({ w: words(t), n: names(t) });
const shared = (a: Set<string>, b: Set<string>) => { let n = 0; for (const x of a) if (b.has(x)) n++; return n; };
function similar(a: Sig, b: Sig) {
  const n = shared(a.w, b.w);
  if (n >= 3 && n / Math.max(1, Math.min(a.w.size, b.w.size)) >= 0.4) return true;
  // Same named entities (Gemini + Carbon, Nadella + trust) plus one more shared word.
  const pn = shared(a.n, b.n);
  return pn >= 2 && n >= pn + 1;
}

/** Strip " - Publisher" and " | Site" tails that news feeds append to titles. */
export const cleanTitle = (t: string, source?: string) => {
  let s = t.replace(/\s+[|–—-]\s+[^|–—-]{2,40}$/, (m) => (source && m.toLowerCase().includes(source.toLowerCase().slice(0, 6)) ? "" : /\s[|]\s/.test(m) || m.length < 34 ? "" : m)).trim();
  if (s.length < 20) s = t;
  return s;
};

const discussLink = (cat: string, title: string, url: string) =>
  `/forums/new/?c=${cat}&title=${encodeURIComponent(title.slice(0, 150))}&link=${encodeURIComponent(url)}`;

/** The company the headline is actually about: the one named first in the title. */
function leadCompany(s: Story) {
  const t = s.title.toLowerCase();
  const pos = (slug: string) => {
    const c = companyBySlug(slug);
    const keys = [c?.name.split(" ")[0].toLowerCase(), slug, ...(c?.keywords ?? [])].filter(Boolean) as string[];
    const hits = keys.map((k) => t.indexOf(k)).filter((i) => i >= 0);
    return hits.length ? Math.min(...hits) : 1e9;
  };
  return [...s.companies].sort((a, b) => pos(a) - pos(b))[0];
}

function fromStory(s: Story): Update | null {
  const age = NOW - Date.parse(s.publishedAt);
  const n = s.sourceCount ?? 1;
  const base = {
    id: `s-${s.id}`, url: s.url, date: s.publishedAt, company: leadCompany(s), companies: s.companies, topics: s.topics, people: s.people,
    source: s.source, sources: n, image: s.image, summary: s.summary, points: s.points,
    headline: cleanTitle(s.title, s.source),
  };
  if (s.isReset) return { ...base, kind: "reset", badge: "Codex reset", weight: 70, discuss: discussLink("codex", s.title, s.url) };
  if (s.isRumor && s.status) {
    const badge = s.status === "confirmed" ? "Confirmed" : s.status === "strong" ? "Strong rumor" : s.status === "developing" ? "Rumor" : "Whisper";
    const weight = s.status === "confirmed" ? 85 : s.status === "strong" ? 72 : s.status === "developing" ? 55 : 30;
    if (s.status === "whisper" && age > 3 * 86400000) return null;
    return { ...base, kind: "rumor", badge, weight, confidence: s.confidence, status: s.status, discuss: discussLink("rumors", s.title, s.url) };
  }
  if (n >= 3 && age < 36 * 3600000) return { ...base, kind: "breaking", badge: "Breaking", weight: 60 + Math.min(25, n * 2), discuss: discussLink("general", s.title, s.url) };
  if (n >= 3) return { ...base, kind: "breaking", badge: "Big story", weight: 45 + Math.min(20, n * 2), discuss: discussLink("general", s.title, s.url) };
  if (s.type === "official" && s.companies.some((c) => LABS.has(c)) && !OFFICIAL_NOISE.test(s.title))
    return { ...base, kind: "official", badge: "Official", weight: 50, discuss: discussLink(s.companies[0] && ["openai", "anthropic", "google", "xai"].includes(s.companies[0]) ? s.companies[0] : "general", s.title, s.url) };
  if ((s.points ?? 0) >= 250) return { ...base, kind: "hot", badge: "Hot on HN", weight: 40 + Math.min(20, (s.points ?? 0) / 50), discuss: discussLink("general", s.title, s.url) };
  if (n === 2 && s.companies.some((c) => LABS.has(c))) return { ...base, kind: "breaking", badge: "Developing", weight: 35, discuss: discussLink("general", s.title, s.url) };
  return null;
}

let cache: Update[] | null = null;

/** Every update in the last `days` days, newest first, duplicates merged. */
export function allUpdates(days = 14): Update[] {
  if (cache) return cache.filter((u) => NOW - Date.parse(u.date) < days * 86400000);
  const out: Update[] = [];
  const horizon = NOW - 30 * 86400000;

  // Model and product releases from the release tracker.
  for (const l of releaseLines) {
    for (const r of l.releases) {
      const t = Date.parse(r.date.length === 10 ? r.date + "T15:00:00Z" : r.date);
      if (t < horizon || r.source === "seed") continue;
      const co = companyBySlug(l.company);
      out.push({
        id: `r-${l.id}-${r.version}`, kind: "release", badge: "Released",
        headline: `${r.name} is out`,
        summary: r.evidence ? `${co?.name ?? l.company} shipped ${r.name}. ${r.evidence.title}.` : `${co?.name ?? l.company} shipped ${r.name}.`,
        url: r.evidence?.url ?? `/c/${l.company}/`, date: new Date(Math.min(t, NOW)).toISOString(),
        company: l.company, companies: [l.company], topics: [l.kind === "robot" ? "robotics" : "models"], people: [],
        source: r.evidence?.source ?? co?.name ?? "", sources: 1, weight: 100,
        discuss: discussLink(["openai", "anthropic", "google", "xai"].includes(l.company) ? l.company : "release-watch", `${r.name} is out`, r.evidence?.url ?? ""),
      });
    }
  }

  // Stable tool releases (Codex CLI, Claude Code, Gemini CLI): the newest one per repo per day.
  for (const repo of repos) {
    const seen = new Set<string>();
    for (const g of repo.releases) {
      if (g.pre || Date.parse(g.date) < horizon) continue;
      const day = g.date.slice(0, 10);
      if (seen.has(day)) continue;
      seen.add(day);
      out.push({
        id: `g-${repo.repo}-${g.tag}`, kind: "update", badge: "Update",
        headline: `${repo.name} ${g.name.replace(/^v/, "")} is out`,
        summary: `New stable version of ${repo.name} on GitHub.`,
        url: g.url, date: g.date, company: repo.company, companies: [repo.company], topics: ["codex"], people: [],
        source: "GitHub", sources: 1, weight: 38, discuss: discussLink("codex", `${repo.name} ${g.name}`, g.url),
      });
    }
  }

  // Codex reset reports.
  for (const r of resets) {
    if (Date.parse(r.date) < horizon) continue;
    out.push({
      id: `x-${r.id}`, kind: "reset", badge: `${r.product} reset`, headline: cleanTitle(r.title, r.source),
      summary: "Usage limits were reset. Check your remaining quota.", url: r.url, date: r.date,
      company: "openai", companies: ["openai"], topics: ["codex"], people: [], source: r.source, sources: 1, weight: 70,
      discuss: discussLink("codex", r.title, r.url),
    });
  }

  for (const s of stories) {
    if (Date.parse(s.publishedAt) < horizon) continue;
    const u = fromStory(s);
    if (u) out.push(u);
  }

  // Official lab videos with real traction.
  for (const v of videos) {
    if (v.channelType !== "official" || Date.parse(v.publishedAt) < horizon || (v.views ?? 0) < 50000) continue;
    out.push({
      id: `v-${v.id}`, kind: "video", badge: "Watch", headline: v.title, url: v.url, date: v.publishedAt, image: v.thumb,
      company: v.companies[0], companies: v.companies, topics: v.topics, people: v.people, source: v.channel, sources: 1,
      weight: 32 + Math.min(20, (v.views ?? 0) / 100000), discuss: discussLink("general", v.title, v.url),
    });
  }

  // Merge near-duplicates: keep the strongest version, credit the others' outlets.
  out.sort((a, b) => b.weight - a.weight || b.date.localeCompare(a.date));
  const kept: (Update & { w: Sig })[] = [];
  for (const u of out) {
    const w = sig(u.headline);
    const dup = kept.find((k) => Math.abs(Date.parse(k.date) - Date.parse(u.date)) < 4 * 86400000 && (k.url === u.url || similar(k.w, w)));
    if (dup) {
      if (u.kind !== "release" && u.kind !== "update") dup.sources += u.sources;
      if (!dup.image && u.image) dup.image = u.image;
      continue;
    }
    kept.push({ ...u, w });
  }
  cache = kept.map(({ w: _w, ...u }) => u).sort((a, b) => b.date.localeCompare(a.date));
  return cache.filter((u) => NOW - Date.parse(u.date) < days * 86400000);
}

export function updatesFor(f: Filter, days = 14) {
  return allUpdates(days).filter((u) =>
    (!f.company || u.companies.includes(f.company)) && (!f.topic || u.topics.includes(f.topic)) && (!f.person || u.people.includes(f.person)));
}

/** The lead: the biggest thing from the last day or two, decayed by age. */
export function leadUpdates(list: Update[], n: number) {
  const score = (u: Update) => u.weight / Math.pow(1 + (NOW - Date.parse(u.date)) / 3600000 / 18, 0.9);
  return [...list].sort((a, b) => score(b) - score(a)).slice(0, n);
}
