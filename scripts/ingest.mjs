#!/usr/bin/env node
// SI Rumors ingest: pulls official feeds, press, Google News, Hacker News,
// Reddit, YouTube and GitHub releases, tags everything to companies, topics
// and people, scores rumors, tracks releases and limit resets, and writes the
// JSON the static site is built from.
//
// Usage: node scripts/ingest.mjs [--data <dir>]
//   DATA dir defaults to ./data. Env: YOUTUBE_API_KEY, GITHUB_TOKEN (optional).

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { XMLParser } from "fast-xml-parser";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const argData = process.argv.indexOf("--data");
const DATA = argData > -1 ? process.argv[argData + 1] : join(ROOT, "data");
mkdirSync(DATA, { recursive: true });

const ENT = JSON.parse(readFileSync(join(ROOT, "config/entities.json"), "utf8"));
const SRC = JSON.parse(readFileSync(join(ROOT, "config/sources.json"), "utf8"));
const SEED = JSON.parse(readFileSync(join(ROOT, "config/releases-seed.json"), "utf8"));

const NOW = Date.now();
const DAY = 86400000;
const UA = "Mozilla/5.0 (compatible; SIRumorsBot/1.0; +https://sirumors.com/about)";
const YT_KEY = process.env.YOUTUBE_API_KEY || "";
const GH_TOKEN = process.env.GITHUB_TOKEN || "";

const health = {}; // source id -> {ok, items, error}
const log = (...a) => console.log(...a);

// ---------- io helpers ----------
const readJSON = (name, fallback) => {
  try { return JSON.parse(readFileSync(join(DATA, name), "utf8")); } catch { return fallback; }
};
const writeJSON = (name, obj) => writeFileSync(join(DATA, name), JSON.stringify(obj, null, 0) + "\n");

async function fetchText(url, { headers = {}, timeout = 20000, retries = 1 } = {}) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), timeout);
      const res = await fetch(url, { headers: { "user-agent": UA, ...headers }, signal: ctl.signal, redirect: "follow" });
      clearTimeout(t);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      lastErr = e;
      if (i < retries) await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw lastErr;
}
const fetchJSON = async (url, opts) => JSON.parse(await fetchText(url, opts));

async function pool(items, n, fn) {
  const out = [];
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); }
  }));
  return out;
}

// ---------- text helpers ----------
const ENTITIES = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'", "&nbsp;": " ", "&#8217;": "’", "&#8216;": "‘", "&#8220;": "“", "&#8221;": "”", "&#8211;": "–", "&#8212;": "—", "&#8230;": "…" };
const decode = (s) => String(s ?? "")
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&[a-z#0-9]+;/gi, (m) => ENTITIES[m] ?? m);
const stripTags = (s) => s.replace(/<!--[\s\S]*?-->/g, " ").replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ");
const stripHtml = (s) => stripTags(decode(stripTags(String(s ?? "")))).replace(/\s+/g, " ").trim();
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s);
const textOf = (v) => (v == null ? "" : typeof v === "object" ? (v["#text"] ?? v["@_href"] ?? "") : String(v));
const hash = (s) => createHash("sha1").update(s).digest("hex").slice(0, 12);
const canonUrl = (u) => {
  try {
    const x = new URL(u);
    [...x.searchParams.keys()].forEach((k) => /^(utm_|ref$|fbclid|gclid|mc_)/.test(k) && x.searchParams.delete(k));
    x.hash = "";
    return x.toString();
  } catch { return u; }
};
const toISO = (d) => { const t = Date.parse(d); return Number.isFinite(t) ? new Date(t).toISOString() : null; };
const STOP = new Set("a an the and or of to in on for with at by from is are was be as it its this that new how why what after over into vs about now just says say will can could your you our we they their his her has have more than up out".split(" "));
const tokens = (s) => new Set(s.toLowerCase().replace(/[^a-z0-9.\- ]/g, " ").split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w)));
const jaccard = (a, b) => { let i = 0; for (const x of a) if (b.has(x)) i++; return i / (a.size + b.size - i || 1); };

// ---------- tagging ----------
const kwRe = (kw) => new RegExp(`(^|[^a-z0-9])${kw.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z0-9])`, "i");
const compiled = {
  companies: ENT.companies.map((c) => ({ slug: c.slug, res: c.keywords.map(kwRe) })),
  topics: ENT.topics.map((t) => ({ slug: t.slug, res: t.keywords.map(kwRe) })),
  people: ENT.people.map((p) => ({ slug: p.slug, res: [kwRe(p.name), kwRe(p.name.split(" ").slice(-1)[0] === "Musk" ? "Musk" : p.name)] })),
};
function tag(text, base = {}) {
  const t = text.toLowerCase();
  const hit = (list) => list.filter((e) => e.res.some((r) => r.test(t))).map((e) => e.slug);
  const companies = new Set([...(base.companies || []), ...hit(compiled.companies)]);
  const topics = new Set([...(base.topics || []), ...hit(compiled.topics)]);
  const people = new Set(hit(compiled.people));
  // a person implies their company tab
  for (const p of people) { const c = ENT.people.find((x) => x.slug === p)?.company; if (c) companies.add(c); }
  return { companies: [...companies], topics: [...topics], people: [...people] };
}

const RUMOR_RE = /\b(rumou?rs?|rumou?red|leak(?:s|ed|er)?|reportedly|sources say|people familiar|according to (?:a |the )?(?:report|sources|people)|is said to|are said to|allegedly|insiders? (?:say|said|claim)|code ?name[ds]?|spotted|hint(?:s|ed)? at|tease[sd]?|could (?:soon )?(?:launch|release|arrive)|expected to (?:launch|release|arrive|debut|ship)|in talks|in the works|unannounced|internal (?:memo|testing|benchmark)|prepping|preparing to (?:launch|release))\b/i;
const RESET_RE = /\b(?:(?:rate|usage) limits?[^.]{0,40}\breset|reset(?:s|ting)?\b[^.]{0,40}\b(?:rate|usage) limits?|limits? (?:have been |were |are )?reset|reset(?:s)? (?:codex|claude code)|(?:codex|claude code)[^.]{0,40}\breset)/i;
const FUTURE_RE = /\b(will|coming|soon|expected|plans?|planning|delay(?:ed|s)?|next|could|may|might|rumou?r|when|later this|teases?|ahead of|prepar(?:es|ing)|upcoming|before|release date|price|specs|vs\.?|compared|review|hands-on|leak)\b/i;
const RESET_NOISE_RE = /\b(show hn|ask hn|tracker|tracking|radar|alerts?|how to|guide|explained|weekly caps|continues your session|what to know|plans,)\b/i;
const LAUNCH_RE = /\b(launch(?:es|ed)?|release[sd]?|unveil(?:s|ed)?|introduc(?:es|ed|ing)|announce[sd]?|debut[s]?|rolls? out|now available|ships?)\b/i;

// ---------- parsers ----------
const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", textNodeName: "#text", processEntities: false, htmlEntities: false });
function parseFeed(raw) {
  const doc = xml.parse(raw);
  const arr = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
  if (doc.rss) {
    return arr(doc.rss.channel?.item).map((it) => ({
      title: stripHtml(textOf(it.title)),
      url: textOf(it.link) || textOf(it.guid),
      date: textOf(it.pubDate) || textOf(it["dc:date"]),
      summary: stripHtml(textOf(it.description) || textOf(it["content:encoded"])),
      source: textOf(it.source),
      sourceUrl: it.source?.["@_url"],
      image: it["media:content"]?.["@_url"] || it["media:thumbnail"]?.["@_url"] || (/(jpe?g|png|webp)/i.test(it.enclosure?.["@_type"] || "") ? it.enclosure?.["@_url"] : undefined),
    }));
  }
  if (doc.feed) {
    return arr(doc.feed.entry).map((e) => {
      const links = arr(e.link);
      const alt = links.find((l) => !l["@_rel"] || l["@_rel"] === "alternate") || links[0];
      return {
        title: stripHtml(textOf(e.title)),
        url: alt?.["@_href"] || "",
        date: textOf(e.published) || textOf(e.updated),
        summary: stripHtml(textOf(e.summary) || textOf(e.content) || textOf(e["media:group"]?.["media:description"])),
        author: textOf(e.author?.name),
        image: e["media:group"]?.["media:thumbnail"]?.["@_url"],
        videoId: textOf(e["yt:videoId"]),
        channelId: textOf(e["yt:channelId"]),
      };
    });
  }
  return [];
}

// ---------- item builder ----------
function makeItem(raw, src) {
  let title = raw.title;
  let sourceName = src.name;
  let url = canonUrl(raw.url || "");
  if (src.gnews) {
    // Google News titles end in " - Publisher"
    const m = title.match(/^(.*) - ([^-]{2,60})$/);
    if (m) { title = m[1].trim(); sourceName = m[2].trim(); }
    if (raw.source) sourceName = raw.source;
    if (/^https?:\/\//.test(sourceName)) sourceName = safeHost(sourceName) || sourceName;
    title = title.replace(/\s+-\s+https?:\/\/\S+$/, "").trim();
  }
  if (!title || !url) return null;
  const publishedAt = toISO(raw.date) || new Date(NOW).toISOString();
  const summary = clip(src.gnews ? "" : raw.summary || "", 320);
  const tags = tag(`${title} ${summary}`, { companies: src.company ? [src.company] : [], topics: src.topic ? [src.topic] : [] });
  const official = src.type === "official";
  const isRumor = !official && RUMOR_RE.test(title + " " + (src.gnews ? "" : summary.slice(0, 200)));
  return {
    id: hash(src.gnews ? title.toLowerCase() : url),
    title, url, summary,
    source: sourceName,
    sourceId: src.id,
    sourceDomain: raw.sourceUrl ? safeHost(raw.sourceUrl) : safeHost(url),
    type: src.type,
    publishedAt,
    image: raw.image || undefined,
    ...tags,
    isRumor,
    isReset: RESET_RE.test(title + " " + summary),
    points: raw.points, comments: raw.comments, discussUrl: raw.discussUrl,
  };
}
function safeHost(u) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } }

const BLOCK = (SRC.blockSources || []).map((x) => x.toLowerCase());
const blocked = (it) => BLOCK.some((b) => (it.source || "").toLowerCase().includes(b) || (it.sourceDomain || "").includes(b) || (it.url || "").includes(b));
function tidy(it) {
  it.title = it.title.replace(/\s+-\s+https?:\/\/\S+$/, "").trim();
  if (/^https?:\/\//.test(it.source)) it.source = safeHost(it.source) || it.source;
  if (/<|&lt;|&#\d+;/.test(it.summary || "")) it.summary = clip(stripHtml(it.summary), 320);
  return it;
}

// ---------- sources ----------
async function ingestFeeds() {
  const items = [];
  await pool(SRC.feeds, 6, async (f) => {
    try {
      const raw = parseFeed(await fetchText(f.url, { retries: f.optional ? 0 : 1 }));
      let n = 0;
      for (const r of raw) {
        const it = makeItem(r, f);
        if (!it) continue;
        if (f.requireMatch && !it.companies.length && !it.topics.length) continue;
        if (f.requireTopic && !it.topics.some((t) => t !== "money" && t !== "policy")) continue;
        items.push(it); n++;
      }
      health[f.id] = { ok: true, items: n, name: f.name };
    } catch (e) {
      health[f.id] = { ok: false, error: String(e.message || e), optional: !!f.optional, name: f.name };
    }
  });
  return items;
}

async function ingestGoogleNews() {
  const items = [];
  const people = ENT.people.map((p) => ({ id: `gn-p-${p.slug}`, name: "Google News", q: p.query, person: p.slug }));
  const all = [...SRC.newsQueries, ...people];
  await pool(all, 4, async (q) => {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q.q + " when:3d")}&hl=en-US&gl=US&ceid=US:en`;
    try {
      const raw = parseFeed(await fetchText(url));
      let n = 0;
      for (const r of raw.slice(0, 40)) {
        const it = makeItem(r, { id: q.id, name: q.name, type: "press", gnews: true });
        if (!it) continue;
        if (q.person && !it.people.includes(q.person)) it.people.push(q.person);
        // A company's own query tags its hits when the headline names it ("SpaceX buys Cursor").
        if (q.company && !it.companies.includes(q.company) && new RegExp(q.match, "").test(it.title)) it.companies.push(q.company);
        if (!it.companies.length && !it.topics.length && !it.people.length) continue;
        items.push(it); n++;
      }
      health[q.id] = { ok: true, items: n, name: `Google News: ${q.person ? ENT.people.find((p) => p.slug === q.person).name : q.q.slice(0, 40)}` };
    } catch (e) {
      health[q.id] = { ok: false, error: String(e.message || e), name: "Google News" };
    }
  });
  return items;
}

async function ingestHN() {
  const items = [];
  const since = Math.floor((NOW - 3 * DAY) / 1000);
  await pool(SRC.hnQueries, 4, async (q) => {
    try {
      const d = await fetchJSON(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&numericFilters=created_at_i>${since},points>40&hitsPerPage=30`);
      for (const h of d.hits || []) {
        const it = makeItem({ title: h.title, url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`, date: h.created_at, summary: "" }, { id: "hn", name: "Hacker News", type: "community" });
        if (!it || (!it.companies.length && !it.topics.length)) continue;
        it.points = h.points; it.comments = h.num_comments; it.discussUrl = `https://news.ycombinator.com/item?id=${h.objectID}`;
        it.id = hash(canonUrl(it.url));
        items.push(it);
      }
      health.hn = { ok: true, items: (health.hn?.items || 0) + (d.hits || []).length, name: "Hacker News" };
    } catch (e) {
      health.hn = { ok: false, error: String(e.message || e), name: "Hacker News" };
    }
  });
  return items;
}

async function ingestYouTube(state) {
  const channels = state.ytChannels || {};
  const all = [...SRC.youtube];
  for (const p of ENT.people) if (p.youtubeHandle && !all.some((c) => c.handle === p.youtubeHandle)) all.push({ name: p.name, handle: p.youtubeHandle, type: "creator" });
  // resolve handles -> channel ids (1 quota unit each, cached forever)
  if (YT_KEY) {
    for (const c of all) {
      if (c.channelId || channels[c.handle]) continue;
      try {
        const d = await fetchJSON(`https://www.googleapis.com/youtube/v3/channels?part=id,snippet&forHandle=${encodeURIComponent(c.handle)}&key=${YT_KEY}`);
        const ch = d.items?.[0];
        if (ch) channels[c.handle] = { id: ch.id, title: ch.snippet.title, thumb: ch.snippet.thumbnails?.default?.url };
      } catch (e) { log("yt handle", c.handle, e.message); }
    }
  }
  state.ytChannels = channels;
  const videos = [];
  await pool(all, 6, async (c) => {
    const cid = c.channelId || channels[c.handle]?.id;
    if (!cid) { health[`yt-${c.name}`] = { ok: false, error: "channel not resolved", optional: true, name: `YouTube: ${c.name}` }; return; }
    try {
      const raw = parseFeed(await fetchText(`https://www.youtube.com/feeds/videos.xml?channel_id=${cid}`));
      let n = 0;
      for (const r of raw) {
        if (!r.videoId) continue;
        const tags = tag(`${r.title} ${r.summary.slice(0, 400)}`, { companies: c.company ? [c.company] : [] });
        if (c.requireMatch && !tags.companies.length && !tags.topics.length) continue;
        if (c.type === "creator" && !tags.companies.length && !tags.topics.length && !tags.people.length) continue;
        videos.push({
          id: r.videoId, title: r.title, channel: c.name, channelId: cid, channelType: c.type,
          url: `https://www.youtube.com/watch?v=${r.videoId}`,
          thumb: `https://i.ytimg.com/vi/${r.videoId}/mqdefault.jpg`,
          publishedAt: toISO(r.date), ...tags,
        });
        n++;
      }
      health[`yt-${c.name}`] = { ok: true, items: n, name: `YouTube: ${c.name}` };
    } catch (e) {
      health[`yt-${c.name}`] = { ok: false, error: String(e.message || e), optional: true, name: `YouTube: ${c.name}` };
    }
  });

  // People appearances: one search per person per day (100 units each).
  const today = new Date(NOW).toISOString().slice(0, 10);
  state.ytPeople = state.ytPeople || {};
  if (YT_KEY) {
    for (const p of ENT.people) {
      const prev = state.ytPeople[p.slug];
      if (prev?.day === today) continue;
      try {
        const after = new Date(NOW - 14 * DAY).toISOString();
        const d = await fetchJSON(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&order=viewCount&maxResults=8&publishedAfter=${after}&q=${encodeURIComponent(p.name + " interview")}&key=${YT_KEY}`);
        state.ytPeople[p.slug] = {
          day: today,
          videos: (d.items || []).filter((v) => v.id?.videoId).map((v) => ({
            id: v.id.videoId, title: decode(v.snippet.title), channel: decode(v.snippet.channelTitle), channelId: v.snippet.channelId,
            url: `https://www.youtube.com/watch?v=${v.id.videoId}`, thumb: `https://i.ytimg.com/vi/${v.id.videoId}/mqdefault.jpg`,
            publishedAt: v.snippet.publishedAt, people: [p.slug], companies: p.company ? [p.company] : [], topics: [], channelType: "appearance",
          })),
        };
      } catch (e) {
        log("yt search", p.slug, e.message);
        health[`yt-search`] = { ok: false, error: String(e.message || e), optional: true, name: "YouTube search" };
        break; // quota exhausted: stop for today, keep yesterday's results
      }
    }
  }
  for (const s of Object.values(state.ytPeople)) for (const v of s.videos || []) videos.push(v);

  // dedupe and attach view counts (1 unit per 50 videos)
  const byId = new Map();
  for (const v of videos) {
    const prev = byId.get(v.id);
    if (prev) { prev.people = [...new Set([...prev.people, ...v.people])]; prev.companies = [...new Set([...prev.companies, ...v.companies])]; }
    else byId.set(v.id, { ...v });
  }
  const list = [...byId.values()].filter((v) => v.publishedAt && NOW - Date.parse(v.publishedAt) < 45 * DAY);
  if (YT_KEY) {
    for (let i = 0; i < list.length; i += 50) {
      const chunk = list.slice(i, i + 50);
      try {
        const d = await fetchJSON(`https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${chunk.map((v) => v.id).join(",")}&key=${YT_KEY}`);
        for (const s of d.items || []) {
          const v = byId.get(s.id);
          v.views = +s.statistics.viewCount || 0;
          v.likes = +s.statistics.likeCount || 0;
          v.duration = isoDur(s.contentDetails.duration);
        }
      } catch (e) { log("yt stats", e.message); }
    }
  }
  return list.filter((v) => !(v.duration > 0 && v.duration <= 60)); // drop Shorts
}
const isoDur = (d) => { const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(d || ""); return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0; };

async function ingestGitHub(state) {
  const store = state.gh || {};
  const headers = { accept: "application/vnd.github+json", ...(GH_TOKEN ? { authorization: `Bearer ${GH_TOKEN}` } : {}) };
  for (const r of SRC.githubRepos) {
    const known = store[r.repo] || { releases: [] };
    const have = new Set(known.releases.map((x) => x.tag));
    const pages = known.releases.length ? 2 : 10;
    try {
      for (let p = 1; p <= pages; p++) {
        const d = await fetchJSON(`https://api.github.com/repos/${r.repo}/releases?per_page=100&page=${p}`, { headers });
        if (!d.length) break;
        let fresh = 0;
        for (const x of d) {
          if (have.has(x.tag_name) || x.draft) continue;
          have.add(x.tag_name);
          known.releases.push({ tag: x.tag_name, name: x.name || x.tag_name, date: x.published_at, pre: !!x.prerelease, url: x.html_url });
          fresh++;
        }
        if (!fresh && known.releases.length > d.length) break;
      }
      known.releases.sort((a, b) => b.date.localeCompare(a.date));
      store[r.repo] = known;
      health[`gh-${r.repo}`] = { ok: true, items: known.releases.length, name: `GitHub: ${r.name}` };
    } catch (e) {
      health[`gh-${r.repo}`] = { ok: false, error: String(e.message || e), name: `GitHub: ${r.name}` };
    }
  }
  state.gh = store;
  return SRC.githubRepos.map((r) => ({ ...r, releases: (store[r.repo]?.releases || []) }));
}

// ---------- clustering & rumors ----------
function cluster(items) {
  const sorted = [...items].sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
  const clusters = [];
  for (const it of sorted) {
    it._tok = tokens(it.title);
    const t = Date.parse(it.publishedAt);
    let best = null, bestScore = 0;
    for (const c of clusters) {
      if (Math.abs(t - c.t) > 3 * DAY) continue;
      let s = jaccard(it._tok, c.tok);
      const samePerson = it.people.some((p) => c.members[0].people.includes(p));
      if (samePerson && Math.abs(t - c.t) < 2 * DAY) s += 0.12;
      if (s > bestScore) { bestScore = s; best = c; }
    }
    if (best && bestScore >= 0.42) { best.members.push(it); }
    else clusters.push({ t, tok: it._tok, members: [it] });
  }
  for (const c of clusters) {
    const lead = c.members.find((m) => m.type === "official") || c.members.find((m) => m.type === "press") || c.members[0];
    const sources = [...new Set(c.members.map((m) => m.source))];
    lead.cluster = c.members.filter((m) => m !== lead).map((m) => ({ source: m.source, url: m.url })).slice(0, 8);
    lead.sourceCount = sources.length;
    for (const k of ["companies", "topics", "people"]) lead[k] = [...new Set(c.members.flatMap((m) => m[k]))];
    const rumorShare = c.members.filter((m) => m.isRumor).length / c.members.length;
    lead.isRumor = (lead.isRumor || rumorShare >= 0.5) && !c.members.some((m) => m.type === "official");
    lead.isReset = c.members.some((m) => m.isReset);
    lead.points = Math.max(...c.members.map((m) => m.points || 0)) || undefined;
    lead.discussUrl = lead.discussUrl || c.members.find((m) => m.discussUrl)?.discussUrl;
    lead._lead = true;
  }
  return sorted.filter((i) => i._lead).map(({ _tok, _lead, ...rest }) => rest);
}

function scoreRumor(r, officialTitles) {
  const pressSources = new Set([r.source, ...(r.cluster || []).map((c) => c.source)]);
  let score = 25 + 14 * (pressSources.size - 1);
  if (r.type === "press" || r.type === "analysis") score += 10;
  if (/\b(bloomberg|reuters|the information|wall street journal|wsj|financial times|the verge|cnbc|axios|nytimes|new york times)\b/i.test([r.source, ...(r.cluster || []).map((c) => c.source)].join(" "))) score += 20;
  if (r.points > 200) score += 8;
  score = Math.min(95, score);
  const toks = tokens(r.title);
  const confirmed = officialTitles.find((o) => Date.parse(o.publishedAt) >= Date.parse(r.publishedAt) - DAY && jaccard(toks, tokens(o.title)) >= 0.3);
  return { confidence: confirmed ? 100 : score, status: confirmed ? "confirmed" : score >= 70 ? "strong" : score >= 45 ? "developing" : "whisper", confirmedBy: confirmed ? { title: confirmed.title, url: confirmed.url } : undefined };
}

// ---------- the labs' own X posts (scripts/labx.mjs) ----------
// Launch posts from the labs themselves are the source of truth for releases.
const X_LAUNCH_RE = /\b(launch(?:es|ed|ing)?|releas(?:e|es|ed|ing)|introduc(?:es|ed|ing)|announc(?:e|es|ed|ing)|rolls? out|rolling out|now available|available (?:now|today|starting today)|(?:is|are) (?:here|live|out)|now live|(?:just|we) shipped|meet\b|debut)/i;
const X_NOISE_RE = /^(try|use|build with|join us|tune in|watch|we.?re hiring|reminder)\b|chance to win|livestream|webinar|giveaway|% off/i;
const LABX = readJSON("labx.json", { tweets: {}, accounts: {} });
// The earliest post we hold per company: inside that window a release needs a lab post to count.
const X_COVERAGE = {};
for (const t of Object.values(LABX.tweets || {})) if (!X_COVERAGE[t.company] || t.at < X_COVERAGE[t.company]) X_COVERAGE[t.company] = t.at;
function labxItems() {
  const out = [];
  for (const t of Object.values(LABX.tweets || {})) {
    const text = t.text.replace(/https?:\/\/\S+/g, "").trim();
    const first = text.split(/\n+/)[0].trim();
    if (!first || X_NOISE_RE.test(first) || !X_LAUNCH_RE.test(text.slice(0, 280))) continue;
    const title = clip(first.length < 25 ? text.replace(/\s*\n+\s*/g, " ") : first, 150);
    const it = makeItem({ title, url: t.url, summary: text.slice(first.length).replace(/\s*\n+\s*/g, " ").trim(), date: t.at, image: t.image }, { id: `x-${t.company}`, name: `${t.name} on X`, type: "official", company: t.company });
    if (it) { it.isX = true; out.push(it); }
  }
  return out;
}

// ---------- releases ----------
function detectReleases(allItems, store) {
  const known = store.detected || [];
  const keyOf = (line, v) => `${line}:${String(v).toLowerCase().replace(/\.0$/, "")}`;
  const seedKeys = new Set(SEED.releases.map((r) => keyOf(r.line, r.version)));
  const have = new Map(known.map((r) => [keyOf(r.line, r.version), r]));
  for (const line of SEED.lines) {
    const d = line.detect;
    if (!d) continue;
    const re = new RegExp(d.pattern, "i");
    const cands = new Map();
    for (const it of allItems) {
      const isX = it.sourceId === `x-${line.company}`;
      if (it.isX && !isX) continue;
      const viaNews = (d.news || d.newsFallback) && it.type !== "official";
      if (!viaNews && d.sources && !d.sources.includes(it.sourceId) && !isX) continue;
      if (d.news && it.type === "official" && !isX) continue;
      if (viaNews && (!LAUNCH_RE.test(it.title) || it.isRumor || FUTURE_RE.test(it.title))) continue;
      if (isX ? !X_LAUNCH_RE.test(it.title) || /\b(soon|upcoming|ago|will (?:launch|be (?:available|released|live)))\b/i.test(it.title) : d.launchWords && !LAUNCH_RE.test(it.title)) continue;
      if (d.news && (it.isRumor || FUTURE_RE.test(it.title))) continue;
      const m = re.exec(it.title);
      if (!m) continue;
      let v = (m.slice(1).find((x) => x && !/^o$/i.test(x)) || "") + (m[2] === "o" || m[2] === "O" ? "o" : "");
      v = v.replace(/\.0$/, "");
      if (!v) continue;
      if (d.min && parseFloat(v) < d.min) continue;
      const k = keyOf(line.id, v);
      const c = cands.get(k) || { line: line.id, version: v, first: it, sources: new Set(), dates: [], official: null };
      if (!viaNews && (!c.official || it.publishedAt < c.official.publishedAt)) c.official = it;
      if (it.publishedAt < c.first.publishedAt) c.first = it;
      if (!c.sources.has(it.source)) c.dates.push(it.publishedAt);
      c.sources.add(it.source);
      cands.set(k, c);
    }
    for (const [k, c] of cands) {
      if (seedKeys.has(k)) continue;
      if (!c.official && c.sources.size < (d.minSources || 3)) continue;
      if (c.official) c.first = c.official;
      const prev = have.get(k);
      const ds = c.dates.sort();
      const date = (c.official ? c.official.publishedAt : ds[Math.min(1, ds.length - 1)]).slice(0, 10);
      if (prev && prev.date <= date && !(c.official && prev.source === "news")) continue;
      const name = d.prefix ? d.prefix + c.version : (line.name.split(" ")[0] === "OpenAI" ? "GPT-" : `${line.name.replace(/^(xAI|Meta|Tesla|Google) /, "")} `) + c.version;
      have.set(k, { line: line.id, name, version: c.version, date, source: c.official ? "official" : "news", evidence: { title: c.first.title, url: c.first.url, source: c.first.source } });
    }
  }
  // A news-only release inside the window where we read the lab's own posts is not
  // trusted: real launches get a post from the lab. It stays stored (hidden) so an
  // official post can still confirm it later.
  for (const r of have.values()) {
    const co = SEED.lines.find((l) => l.id === r.line)?.company;
    r.unverified = r.source === "news" && !!X_COVERAGE[co] && r.date >= X_COVERAGE[co].slice(0, 10);
  }
  store.detected = [...have.values()].sort((a, b) => a.date.localeCompare(b.date));
  return store;
}

function buildReleases(store) {
  const all = [
    ...SEED.releases.map((r) => ({ ...r, source: "seed" })),
    ...store.detected.filter((r) => !r.unverified),
  ];
  const lines = SEED.lines.map((l) => {
    const rel = all.filter((r) => r.line === l.id).sort((a, b) => a.date.localeCompare(b.date));
    // collapse same-day duplicates (e.g. a model family announced together)
    const uniq = [];
    for (const r of rel) { if (!uniq.length || uniq[uniq.length - 1].date !== r.date || uniq[uniq.length - 1].version !== r.version) uniq.push(r); }
    const days = [...new Set(uniq.map((r) => r.date))];
    const gaps = days.slice(1).map((d, i) => (Date.parse(d) - Date.parse(days[i])) / DAY);
    const recent = gaps.slice(-5).sort((a, b) => a - b);
    const median = recent.length ? recent[Math.floor(recent.length / 2)] : null;
    const last = days[days.length - 1];
    const expected = median && last ? new Date(Date.parse(last) + median * DAY).toISOString().slice(0, 10) : null;
    const stale = !l.retired && expected && median && NOW - Date.parse(expected) > 90 * DAY;
    return { ...l, detect: undefined, releases: uniq, stale, medianGapDays: median ? Math.round(median) : null, lastRelease: last || null, expectedNext: l.retired ? null : expected, overdue: !l.retired && expected ? Date.parse(expected) < NOW : false };
  });
  return { lines, generatedAt: new Date(NOW).toISOString() };
}

// ---------- one-time backfill ----------
// Google News supports after:/before:, so month-by-month searches recover the
// release history for labs without an official feed, plus past limit resets.
async function backfill() {
  const items = [];
  const months = [];
  for (let d = new Date("2025-06-01T00:00:00Z"); d.getTime() < NOW; d.setUTCMonth(d.getUTCMonth() + 1)) months.push(new Date(d));
  const queries = [];
  for (const line of SEED.lines) if (line.detect?.backfill) for (const m of months) queries.push({ q: line.detect.backfill, m });
  for (const m of months) queries.push({ q: '(Codex OR "Claude Code") ("rate limits" OR "usage limits") reset', m, reset: true });
  await pool(queries, 3, async ({ q, m }) => {
    const end = new Date(m); end.setUTCMonth(end.getUTCMonth() + 1);
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(`${q} after:${m.toISOString().slice(0, 10)} before:${end.toISOString().slice(0, 10)}`)}&hl=en-US&gl=US&ceid=US:en`;
    try {
      for (const r of parseFeed(await fetchText(url))) { const it = makeItem(r, { id: "gn-backfill", name: "Google News", type: "press", gnews: true }); if (it) items.push(it); }
    } catch (e) { log("backfill", q, e.message); }
    await new Promise((r) => setTimeout(r, 400));
  });
  for (const q of ["codex limits reset", "codex rate limits reset", "claude code limits reset", "codex usage reset"]) {
    try {
      const d = await fetchJSON(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&hitsPerPage=50`);
      for (const h of d.hits || []) { const it = makeItem({ title: h.title, url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`, date: h.created_at }, { id: "hn", name: "Hacker News", type: "community" }); if (it) items.push(it); }
    } catch (e) { log("backfill hn", e.message); }
  }
  log(`backfill: ${items.length} items`);
  return items;
}

// ---------- history ----------
function updateHistory(archive, history, items) {
  for (const it of items) {
    if (archive.ids[it.id]) continue;
    archive.ids[it.id] = 1;
    archive.recs.push({ d: it.publishedAt.slice(0, 10), c: it.companies, t: it.topics, p: it.people, r: it.isRumor ? 1 : 0 });
  }
  // keep 120 days of records
  const cut = new Date(NOW - 120 * DAY).toISOString().slice(0, 10);
  archive.recs = archive.recs.filter((r) => r.d >= cut);
  const keep = new Set();
  for (const it of items) keep.add(it.id);
  if (Object.keys(archive.ids).length > 60000) archive.ids = Object.fromEntries([...keep].map((k) => [k, 1]));
  // recompute daily counts within the archive window; older days stay frozen
  const days = {};
  for (const r of archive.recs) {
    const day = (days[r.d] ||= { n: 0, r: 0, c: {}, t: {}, p: {} });
    day.n++; day.r += r.r;
    for (const k of r.c) day.c[k] = (day.c[k] || 0) + 1;
    for (const k of r.t) day.t[k] = (day.t[k] || 0) + 1;
    for (const k of r.p) day.p[k] = (day.p[k] || 0) + 1;
  }
  for (const [d, v] of Object.entries(days)) if (d >= cut) history.days[d] = v;
  return { archive, history };
}

// ---------- main ----------
async function main() {
  const state = readJSON("state.json", {});
  const prevRaw = readJSON("raw.json", { items: [] });

  const [feeds, gnews, hn] = await Promise.all([ingestFeeds(), ingestGoogleNews(), ingestHN()]);
  const videos = await ingestYouTube(state);
  const repos = await ingestGitHub(state);

  // keep earlier items still inside the window so a flaky source doesn't empty a tab
  const fresh = [...feeds, ...gnews, ...hn, ...labxItems()].filter((i) => Date.parse(i.publishedAt) <= NOW + 3600000);
  const byId = new Map();
  // Stored items are re-tagged with today's keywords, so a narrowed keyword list
  // (or a company query's headline check) also cleans up what was tagged before.
  const QUERY = Object.fromEntries(SRC.newsQueries.filter((q) => q.company).map((q) => [q.id, q]));
  const FEED_CO = Object.fromEntries(SRC.feeds.filter((f) => f.company).map((f) => [f.id, f.company]));
  const retag = (it) => {
    const t = tag(`${it.title} ${it.summary ?? ""}`);
    const keep = new Set(t.companies);
    const own = FEED_CO[it.sourceId] ?? (it.sourceId?.startsWith("x-") ? it.sourceId.slice(2) : null);
    if (own) keep.add(own);
    const q = QUERY[it.sourceId];
    if (q && new RegExp(q.match).test(it.title)) keep.add(q.company);
    // Companies we never had keywords for (YouTube channel tags and the like) stay.
    for (const c of it.companies) if (!ENT.companies.some((e) => e.slug === c)) keep.add(c);
    it.companies = [...keep];
  };
  for (const it of [...(prevRaw.items || []), ...fresh]) {
    if (NOW - Date.parse(it.publishedAt) > 21 * DAY) continue;
    if (blocked(it)) continue;
    tidy(it);
    if (it.companies) retag(it);
    byId.set(it.id, { ...byId.get(it.id), ...it });
  }
  const raw = [...byId.values()];
  const freshCount = fresh.filter((i) => !i.isX && NOW - Date.parse(i.publishedAt) < 2 * DAY).length;
  if (freshCount < 40) {
    console.error(`ABORT: only ${freshCount} fresh items from sources; keeping previous data.`);
    writeJSON("meta.json", { ...readJSON("meta.json", {}), lastAttempt: new Date(NOW).toISOString(), lastAttemptOk: false, health });
    process.exit(2);
  }

  // releases detection reads the full official feeds (deep history) too
  const backfilled = process.argv.includes("--backfill") ? await backfill() : [];
  const releaseStore = detectReleases([...fresh, ...backfilled], readJSON("releases-store.json", { detected: [] }));
  const releases = buildReleases(releaseStore);

  const clustered = cluster(raw).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const official = clustered.filter((i) => i.type === "official");
  const rumors = clustered.filter((i) => i.isRumor && NOW - Date.parse(i.publishedAt) < 14 * DAY).map((r) => ({ ...r, ...scoreRumor(r, official) }));
  const rumorById = new Map(rumors.map((r) => [r.id, r]));
  const items = clustered
    .filter((i) => NOW - Date.parse(i.publishedAt) < 14 * DAY)
    .map((i) => (rumorById.has(i.id) ? rumorById.get(i.id) : i))
    .slice(0, 1500);

  // limit-reset tracker (persisted)
  const resets = readJSON("resets.json", { events: [] });
  const seen = new Set(resets.events.map((e) => e.id));
  resets.events = resets.events.filter((e) => !RESET_NOISE_RE.test(e.title));
  for (const it of [...clustered, ...backfilled].filter((i) => i.isReset && !RESET_NOISE_RE.test(i.title))) {
    if (seen.has(it.id)) continue;
    seen.add(it.id);
    const product = /codex/i.test(it.title) ? "Codex" : /claude|anthropic|opus|sonnet/i.test(it.title) ? "Claude" : /gemini/i.test(it.title) ? "Gemini" : /chatgpt|gpt-|openai/i.test(it.title) ? "ChatGPT" : "Other";
    resets.events.push({ id: it.id, date: it.publishedAt, product, title: it.title, url: it.url, source: it.source });
  }
  resets.events.sort((a, b) => b.date.localeCompare(a.date));

  const { archive, history } = updateHistory(readJSON("archive.json", { ids: {}, recs: [] }), readJSON("history.json", { days: {} }), raw);

  writeJSON("feed.json", { generatedAt: new Date(NOW).toISOString(), items });
  writeJSON("raw.json", { items: raw });
  writeJSON("rumors.json", { generatedAt: new Date(NOW).toISOString(), rumors });
  writeJSON("videos.json", { generatedAt: new Date(NOW).toISOString(), videos: videos.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)) });
  writeJSON("releases.json", releases);
  writeJSON("releases-store.json", releaseStore);
  writeJSON("github.json", { generatedAt: new Date(NOW).toISOString(), repos });
  writeJSON("resets.json", resets);
  writeJSON("history.json", history);
  writeJSON("archive.json", archive);
  writeJSON("state.json", state);
  const failing = Object.entries(health).filter(([, h]) => !h.ok && !h.optional).map(([k]) => k);
  writeJSON("meta.json", { lastUpdated: new Date(NOW).toISOString(), lastAttempt: new Date(NOW).toISOString(), lastAttemptOk: true, counts: { items: items.length, rumors: rumors.length, videos: videos.length, fresh48h: freshCount }, failing, health });
  log(`ok: ${items.length} stories (${freshCount} fresh), ${rumors.length} rumors, ${videos.length} videos, ${releases.lines.reduce((n, l) => n + l.releases.length, 0)} releases, ${resets.events.length} resets; failing: ${failing.join(", ") || "none"}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
