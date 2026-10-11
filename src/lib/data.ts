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
  releases: Release[];
  medianGapDays: number | null;
  lastRelease: string | null;
  expectedNext: string | null;
  overdue: boolean;
  stale: boolean;
};

export type GhRelease = { tag: string; name: string; date: string; pre: boolean; url: string };
export type Repo = { repo: string; name: string; company: string; releases: GhRelease[] };
export type ResetEvent = { id: string; date: string; product: string; title: string; url: string; source: string };
export type DayCounts = { n: number; r: number; c: Record<string, number>; t: Record<string, number>; p: Record<string, number> };
export type Health = Record<string, { ok: boolean; items?: number; error?: string; optional?: boolean; name?: string }>;

const feed = load<{ generatedAt?: string; items: Story[] }>("feed.json", { items: [] });
const rumorsData = load<{ rumors: Story[] }>("rumors.json", { rumors: [] });
const videosData = load<{ videos: Video[] }>("videos.json", { videos: [] });
const releasesData = load<{ lines: ReleaseLine[] }>("releases.json", { lines: [] });
const githubData = load<{ repos: Repo[] }>("github.json", { repos: [] });
const resetsData = load<{ events: ResetEvent[] }>("resets.json", { events: [] });
const historyData = load<{ days: Record<string, DayCounts> }>("history.json", { days: {} });
export type RankRow = { model: string; raw: string; org: string; company: string | null; rating: number; votes: number; rank: number };
export type Board = { id: string; label: string; blurb: string; unit: string; published: string; top: RankRow[]; leaderSince?: string; prevLeader?: string | null };
export type Outcome = { name: string; yes: number; change: number | null; volume: number };
export type Market = { id: string; slug: string; title: string; url: string; image: string | null; volume: number; volume24h: number; endDate: string | null; binary: boolean; outcomes: Outcome[]; priority: number };
const rankingsData = load<{ generatedAt?: string; published?: string; boards: Board[] }>("rankings.json", { boards: [] });
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
export const releaseLines = releasesData.lines;
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

/** Actual limit resets (not policy chatter), newest first, one per company per day.
 *  Codex and ChatGPT are both OpenAI, so they share one line and one "days since last" count. */
const RESET_CO: Record<string, string> = { Codex: "OpenAI", ChatGPT: "OpenAI", Claude: "Anthropic", Gemini: "Google" };
export function resetHistory() {
  const real = /\breset(s|ting)?\b|reset again|another reset|limits? removed/i;
  const chatter = /pledg|offering|or a full|rumou?r|losing|introduc|tests?\b|option|plans,|referral|how to|explained|what is|paid resets/i;
  const seen = new Set<string>();
  return resets.map((r) => ({ ...r, product: /^(anthropic|claude)\b/i.test(r.title) ? "Anthropic" : RESET_CO[r.product] ?? r.product })).filter((r) => {
    const k = `${r.product}|${r.date.slice(0, 10)}`;
    if (!real.test(r.title) || chatter.test(r.title) || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
