import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import entities from "../../config/entities.json";

// Build-time data loader. The ingest job writes JSON into ./data (or
// SIR_DATA); every page reads it while the static site is generated.
const DATA = process.env.SIR_DATA || join(/*turbopackIgnore: true*/ process.cwd(), "data");

function load<T>(name: string, fallback: T): T {
  const p = join(DATA, name);
  if (!existsSync(p)) return fallback;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export type Company = (typeof entities.companies)[number];
export type Topic = (typeof entities.topics)[number];
export type Person = (typeof entities.people)[number] & { youtubeHandle?: string; x?: string; company?: string };

export type Story = {
  id: string;
  title: string;
  url: string;
  summary: string;
  source: string;
  sourceId: string;
  sourceDomain: string;
  type: "official" | "press" | "analysis" | "community";
  publishedAt: string;
  image?: string;
  companies: string[];
  topics: string[];
  people: string[];
  isRumor: boolean;
  isReset: boolean;
  points?: number;
  comments?: number;
  discussUrl?: string;
  cluster?: { source: string; url: string }[];
  sourceCount?: number;
  confidence?: number;
  status?: "whisper" | "developing" | "strong" | "confirmed";
  confirmedBy?: { title: string; url: string };
  /** The publisher's own link; never shown as a link, the site keeps readers on its own pages. */
  sourceUrl?: string;
  /** The publisher's original headline, before our rewrite. */
  origTitle?: string;
  /** Our own write-up, when the copywriter has done this story. */
  body?: string[];
};

export type Video = {
  id: string;
  title: string;
  channel: string;
  channelType: "official" | "creator" | "appearance";
  url: string;
  thumb: string;
  publishedAt: string;
  views?: number;
  duration?: number;
  companies: string[];
  topics: string[];
  people: string[];
  youtubeId?: string;
};

export type Release = {
  line: string;
  name: string;
  version: string;
  date: string;
  source: "seed" | "official" | "news";
  precision?: string;
  evidence?: { title: string; url: string; source: string };
};

export type ReleaseLine = {
  id: string;
  name: string;
  company: string;
  kind: string;
  retired?: string;
  releases: (Release & { page?: string })[];
  medianGapDays: number | null;
  lastRelease: string | null;
  expectedNext: string | null;
  overdue: boolean;
  stale: boolean;
};

export type GhRelease = { tag: string; name: string; date: string; pre: boolean; url: string };
export type Repo = { repo: string; name: string; company: string; releases: GhRelease[] };
export type ResetEvent = { id: string; date: string; product: string; title: string; url: string; source: string };
/** A usage-limit reset at any lab, as the lab (or its staff) posted it on X. */
export type XReset = { id: string; company: string; product: string; byName?: string; sourceUrl?: string; date: string; announcedAt: string; status: "done" | "coming"; banked: boolean; title: string; quote: string; url: string; by: string; tweets: { handle: string; url: string; at: string }[] };
export type DayCounts = { n: number; r: number; c: Record<string, number>; t: Record<string, number>; p: Record<string, number> };
export type Health = Record<string, { ok: boolean; items?: number; error?: string; optional?: boolean; name?: string }>;

const feed = load<{ generatedAt?: string; items: Story[] }>("feed.json", { items: [] });

// Our own wording for each story (headline, short summary, body), written by the
// copywriter lane into copy/copy.json. Until a story is written it shows the feed's text.
export type Copy = { headline: string; summary: string; body: string[] };
const COPY_FILE = process.env.SIR_COPY || join(/*turbopackIgnore: true*/ process.cwd(), "copy", "copy.json");
const copyData: { items: Record<string, Copy> } = (() => {
  try { return existsSync(COPY_FILE) ? JSON.parse(readFileSync(COPY_FILE, "utf8")) : { items: {} }; } catch { return { items: {} }; }
})();
export const copyFor = (id: string): Copy | undefined => copyData.items?.[id];
/** Every story, release, reset and video has its own page on the site. */
export const pageId = (id: string) => id.replace(/[^a-zA-Z0-9._-]/g, "-");
export const pagePath = (id: string) => `/n/${pageId(id)}/`;
function ownPage(s: Story) {
  if (s.sourceUrl) return s;
  const id = `s-${s.id}`;
  const c = copyFor(id);
  s.sourceUrl = s.url;
  s.url = pagePath(id);
  s.origTitle = s.title;
  if (c) { s.title = c.headline; s.summary = c.summary; s.body = c.body; }
  return s;
}
feed.items.forEach(ownPage);
const rumorsData = load<{ rumors: Story[] }>("rumors.json", { rumors: [] });
rumorsData.rumors.forEach(ownPage);
const videosData = load<{ videos: Video[] }>("videos.json", { videos: [] });
for (const v of videosData.videos) { v.youtubeId = v.id; v.url = pagePath(`v-${v.id}`); }
const releasesData = load<{ lines: ReleaseLine[] }>("releases.json", { lines: [] });
for (const l of releasesData.lines) for (const r of l.releases) r.page = pagePath(`r-${l.id}-${r.version}`);
const githubData = load<{ repos: Repo[] }>("github.json", { repos: [] });
const resetsData = load<{ events: ResetEvent[] }>("resets.json", { events: [] });
const xresetsData = load<{ fetchedAt?: string; events: XReset[] }>("xresets.json", { events: [] });
export const xresets = xresetsData.events.map((r) => ({ ...r, sourceUrl: r.url, url: pagePath(r.id) }));
export const xresetsAt = xresetsData.fetchedAt ?? "";
const historyData = load<{ days: Record<string, DayCounts> }>("history.json", { days: {} });
export type RankRow = { model: string; raw: string; org: string; company: string | null; rating: number; votes: number; rank: number };
/** One model on the frontier list: its average placing across overall, hard prompts, coding and agents. */
export type FrontierModel = { rank: number; slug: string; model: string; org: string; orgName: string; company: string | null; open: boolean; score: number; boards: Record<string, { pos: number; rating: number; votes: number }> };
export type Board = { id: string; label: string; blurb: string; unit: string; published: string; top: RankRow[]; leaderSince?: string; prevLeader?: string | null };
export type Outcome = { name: string; yes: number; change: number | null; volume: number };
export type Market = { id: string; slug: string; title: string; url: string; image: string | null; volume: number; volume24h: number; endDate: string | null; binary: boolean; outcomes: Outcome[]; priority: number };
const rankingsData = load<{ generatedAt?: string; published?: string; boards: Board[]; frontier?: FrontierModel[] }>("rankings.json", { boards: [] });
export const frontier = rankingsData.frontier ?? [];
export const frontierBySlug = (s: string) => frontier.find((m) => m.slug === s);
const marketsData = load<{ generatedAt?: string; markets: Market[] }>("markets.json", { markets: [] });
export const boards = rankingsData.boards;
export const boardsPublished = rankingsData.published ?? "";
export const markets = marketsData.markets;
export const board = (id: string) => boards.find((b) => b.id === id);

const metaData = load<{ lastUpdated?: string; counts?: Record<string, number>; health?: Health; failing?: string[] }>("meta.json", {});

export const companies = entities.companies as Company[];
export const topics = entities.topics as Topic[];
export const people = entities.people as Person[];

export const stories = feed.items;
export const rumors = [...rumorsData.rumors].sort(
  (a, b) => (b.confidence ?? 0) - (a.confidence ?? 0) || b.publishedAt.localeCompare(a.publishedAt),
);
export const videos = videosData.videos;
// Lines with nothing confirmed yet (a new company before its first lab-announced release) stay hidden.
export const releaseLines = releasesData.lines.filter((l) => l.releases.length);
export const repos = githubData.repos;
export const resets = resetsData.events;
export const history = historyData.days;
export const meta = metaData;
export const generatedAt = metaData.lastUpdated || feed.generatedAt || new Date().toISOString();
export const NOW = Date.parse(generatedAt);
// Live tracking began 2026-10-11; earlier days only hold backfilled coverage, so
// week-over-week change waits for two full tracked weeks.
const TRACKING_START = Date.parse("2026-10-11T00:00:00Z");
const trackedDays = (NOW - TRACKING_START) / 86400000;

export const companyBySlug = (s: string) => companies.find((c) => c.slug === s);
export const topicBySlug = (s: string) => topics.find((t) => t.slug === s);
export const personBySlug = (s: string) => people.find((p) => p.slug === s);

export type Filter = { company?: string; topic?: string; person?: string };
const matches = (x: { companies: string[]; topics: string[]; people: string[] }, f: Filter) =>
  (!f.company || x.companies.includes(f.company)) &&
  (!f.topic || x.topics.includes(f.topic)) &&
  (!f.person || x.people.includes(f.person));

export const storiesFor = (f: Filter) => stories.filter((s) => matches(s, f));
export const rumorsFor = (f: Filter) => rumors.filter((s) => matches(s, f));
export const videosFor = (f: Filter) => videos.filter((v) => matches(v, f));

/** Rank stories for "top" lists: corroboration, official status, freshness, HN points. */
export function topStories(list: Story[], n: number) {
  const notable = (s: Story) => (s.sourceCount ?? 1) >= 2 || s.type === "official" || (s.points ?? 0) >= 100;
  const score = (s: Story) => {
    const ageH = Math.max(1, (NOW - Date.parse(s.publishedAt)) / 3600000);
    const weight = Math.pow(s.sourceCount ?? 1, 1.3) * 2 + (s.type === "official" ? 5 : 0) + Math.min(8, (s.points ?? 0) / 80);
    return weight / Math.pow(ageH + 3, 0.8);
  };
  const ranked = [...list].sort((a, b) => score(b) - score(a));
  const strong = ranked.filter(notable);
  return (strong.length >= n ? strong : [...strong, ...ranked.filter((s) => !notable(s))]).slice(0, n);
}

/** Daily mention counts for the last `days` days (oldest first). */
export function series(kind: "c" | "t" | "p" | "n" | "r", slug: string | null, days: number) {
  const out: { date: string; value: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(NOW - i * 86400000).toISOString().slice(0, 10);
    const d = history[date];
    const value = !d ? 0 : kind === "n" ? d.n : kind === "r" ? d.r : (d[kind][slug!] ?? 0);
    out.push({ date, value });
  }
  return out;
}

export function momentum(kind: "c" | "t" | "p", slug: string) {
  const s = series(kind, slug, 14);
  const last7 = s.slice(7).reduce((a, b) => a + b.value, 0);
  const prev7 = s.slice(0, 7).reduce((a, b) => a + b.value, 0);
  // Week-over-week change only means something with a real baseline.
  return { last7, prev7, change: prev7 >= 10 && trackedDays >= 15 ? (last7 - prev7) / prev7 : 0, hasBaseline: prev7 >= 10 && trackedDays >= 15 };
}

export const linesFor = (company: string) => releaseLines.filter((l) => l.company === company);

export function upcoming() {
  return releaseLines
    .filter((l) => l.expectedNext && !l.retired && !l.stale)
    .sort((a, b) => (a.expectedNext! < b.expectedNext! ? -1 : 1));
}

export function allReleases() {
  return releaseLines
    .flatMap((l) => l.releases.map((r) => ({ ...r, lineName: l.name, company: l.company })))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export const logoFor = (slug: string) => `/logos/${slug}.png`;

/** Usage resets at every lab, newest first, as announced on X (news reports were too noisy). */
export function resetHistory(company?: string): XReset[] {
  return xresets.map((r) => ({ ...r, company: r.company ?? "openai", product: r.product ?? "ChatGPT & Codex" })).filter((r) => !company || r.company === company);
}

/** The release a model came out in: "GPT-6 Astra" shipped as part of "GPT-6". Longest matching name wins. */
export function releaseFor(model: string) {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9.]+/g, " ").trim();
  const want = norm(model) + " ";
  return allReleases().filter((r) => want.startsWith(norm(r.name) + " ")).sort((a, b) => b.name.length - a.name.length)[0];
}
