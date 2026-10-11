#!/usr/bin/env node
// Model rankings (Arena leaderboards, published on Hugging Face) and AI
// prediction markets (Polymarket public API). Writes data/rankings.json and
// data/markets.json; on any failure the previous file is kept.
// Usage: node scripts/boards.mjs --data data
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parquetReadObjects } from "hyparquet";

const DATA = process.argv.includes("--data") ? process.argv[process.argv.indexOf("--data") + 1] : "data";
const log = (...a) => console.log("[boards]", ...a);
const write = (name, obj) => writeFileSync(join(DATA, name), JSON.stringify(obj, null, 1));
const read = (name, fb) => { try { return existsSync(join(DATA, name)) ? JSON.parse(readFileSync(join(DATA, name), "utf8")) : fb; } catch { return fb; } };

async function get(url, as = "json", tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { "user-agent": "sirumors.com boards" }, signal: AbortSignal.timeout(45000) });
      if (r.ok) return as === "json" ? r.json() : r.arrayBuffer();
      if (r.status < 500 && r.status !== 429) throw new Error(`HTTP ${r.status}`);
    } catch (e) { if (i === tries - 1) throw e; }
    await new Promise((s) => setTimeout(s, 2000 * (i + 1)));
  }
}

// ---------- Rankings ----------
const BOARDS = [
  { id: "overall", label: "Best AI model", blurb: "Overall text Arena", cfg: "text", cat: "overall" },
  { id: "coding", label: "Best for coding", blurb: "WebDev Arena", cfg: "webdev", cat: "overall" },
  { id: "agent", label: "Best agent", blurb: "Agent Arena", cfg: "agent", cat: "overall" },
  { id: "open", label: "Best open model", blurb: "Overall text, open weights only", cfg: "text", cat: "overall", open: true },
  { id: "hard", label: "Best for hard problems", blurb: "Hard prompts", cfg: "text", cat: "hard_prompts" },
  { id: "math", label: "Best at math", blurb: "Math prompts", cfg: "text", cat: "math" },
  { id: "writing", label: "Best writer", blurb: "Creative writing", cfg: "text", cat: "creative_writing" },
  { id: "search", label: "Best AI search", blurb: "Search Arena", cfg: "search", cat: "overall" },
  { id: "vision", label: "Best vision", blurb: "Vision Arena", cfg: "vision", cat: "overall" },
  { id: "image", label: "Best image model", blurb: "Text-to-image Arena", cfg: "text_to_image", cat: "overall" },
  { id: "video", label: "Best video model", blurb: "Text-to-video Arena", cfg: "text_to_video", cat: "overall" },
];

const ORG = { google: "google", anthropic: "anthropic", openai: "openai", xai: "xai", meta: "meta", deepseek: "deepseek", mistral: "mistral", microsoft: "microsoft", nvidia: "nvidia", alibaba: "alibaba", amazon: "amazon", apple: "apple", spacexai: "xai" };
// One row per model: drop effort/size suffixes so "-high" and "-max" variants collapse.
const base = (m) => m.toLowerCase().replace(/\s*\((high|max|low|medium|xhigh|thinking)\)/g, "").replace(/\s+/g, "-").replace(/[-_ ](high|max|low|medium|xhigh|thinking|reasoning|preview|exp|experimental|latest|\d{8}|\d{4}-\d{2}-\d{2})\b/g, "").replace(/[-_ ](high|max|low|medium|thinking)$/g, "");
const pretty = (m) => base(m).split(/[-_]/).map((w) => (/^\d/.test(w) ? w : w === "gpt" ? "GPT" : w.length <= 2 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1))).join(" ")
  .replace(/(\d) (\d)/g, "$1.$2").replace(/^GPT (\d)/, "GPT-$1").replace(/\bGlm\b/, "GLM").replace(/\bMimo\b/, "MiMo").replace(/\bQwen(\d)/, "Qwen $1").replace(/\bOss\b/, "OSS");

async function rankings() {
  const cache = {};
  const boards = [];
  let published = "";
  for (const b of BOARDS) {
    try {
      if (!cache[b.cfg]) {
        const buf = await get(`https://huggingface.co/api/datasets/lmarena-ai/leaderboard-dataset/parquet/${b.cfg}/latest/0.parquet`, "buf");
        // Most boards report an Elo-style rating; the agent board reports a win score (0 to 1).
        cache[b.cfg] = (await parquetReadObjects({ file: buf }))
          .map((r) => ({ ...r, rating: r.rating != null ? Number(r.rating) : Number(r.score) * 100, rank: Number(r.rank), vote_count: Number(r.vote_count ?? r.session_count ?? 0) }));
      }
      const rows = cache[b.cfg].filter((r) => r.category === b.cat && (!b.open || !/proprietary/i.test(r.license ?? "")))
        .sort((x, y) => y.rating - x.rating);
      const seen = new Set();
      const top = [];
      for (const r of rows) {
        const k = base(r.model_name);
        if (seen.has(k)) continue;
        seen.add(k);
        top.push({ model: pretty(r.model_name), raw: r.model_name, org: String(r.organization ?? "").toLowerCase(), company: ORG[String(r.organization ?? "").toLowerCase()] ?? null, rating: b.cfg === "agent" ? Math.round(r.rating * 10) / 10 : Math.round(r.rating), votes: r.vote_count, rank: r.rank });
        if (top.length === 8) break;
      }
      if (top.length) {
        boards.push({ id: b.id, label: b.label, blurb: b.blurb, unit: b.cfg === "agent" ? "score" : "Elo", published: rows[0]?.leaderboard_publish_date ?? "", top });
        published = published > (rows[0]?.leaderboard_publish_date ?? "") ? published : rows[0]?.leaderboard_publish_date ?? "";
      }
    } catch (e) { log(`board ${b.id} failed: ${e.message}`); }
  }
  if (boards.length < 4) throw new Error(`only ${boards.length} boards`);
  const prev = read("rankings.json", { boards: [], history: {} });
  // Daily #1 history per board, to show "new #1" and how long a model has held it.
  const history = prev.history ?? {};
  const today = new Date().toISOString().slice(0, 10);
  for (const b of boards) {
    const h = (history[b.id] ??= []);
    const leader = b.top[0].model;
    if (!h.length || h[h.length - 1].model !== leader) h.push({ model: leader, company: b.top[0].company, since: today });
    b.leaderSince = h[h.length - 1].since;
    b.prevLeader = h.length > 1 ? h[h.length - 2].model : null;
  }
  const frontier = frontierList(cache);
  write("rankings.json", { generatedAt: new Date().toISOString(), published, source: "Arena (arena.ai) leaderboards via Hugging Face", boards, frontier, history });
  log(`rankings: ${boards.length} boards, published ${published}`);
}

// The frontier list: one ranked list of the best models across the boards that test
// raw capability (overall, hard prompts, coding, agents). On each board a model scores
// 100 for #1 down to 0 for #20 by its placing; its frontier score is the average over
// the boards it is on (at least two). Models missing from a board (GPT-6 Astra is not
// on the text board) are judged on the rest.
const ORG_NAME = { google: "Google", anthropic: "Anthropic", openai: "OpenAI", xai: "xAI", meta: "Meta", deepseek: "DeepSeek", mistral: "Mistral", alibaba: "Alibaba", xiaomi: "Xiaomi", moonshot: "Moonshot AI", zai: "Z.ai", tencent: "Tencent", baidu: "Baidu", amazon: "Amazon", microsoft: "Microsoft", nvidia: "NVIDIA", minimax: "MiniMax", bytedance: "ByteDance" };
const FRONTIER = [["overall", "text", "overall"], ["hard", "text", "hard_prompts"], ["coding", "webdev", "overall"], ["agent", "agent", "overall"]];
function frontierList(cache) {
  const models = new Map();
  for (const [id, cfg, cat] of FRONTIER) {
    if (!cache[cfg]) continue;
    const seen = new Set();
    const list = [];
    for (const r of cache[cfg].filter((r) => r.category === cat).sort((x, y) => y.rating - x.rating)) {
      const k = base(r.model_name).replace(/-search$/, "");
      if (seen.has(k)) continue;
      seen.add(k);
      list.push({ k, r });
    }
    list.slice(0, 40).forEach(({ k, r }, i) => {
      const m = models.get(k) ?? { slug: k.replace(/\./g, "-"), model: pretty(r.model_name), org: String(r.organization ?? "").toLowerCase(), orgName: ORG_NAME[String(r.organization ?? "").toLowerCase()] ?? String(r.organization ?? ""), company: ORG[String(r.organization ?? "").toLowerCase()] ?? null, open: !/proprietary/i.test(r.license ?? ""), boards: {} };
      m.boards[id] = { pos: i + 1, rating: cfg === "agent" ? Math.round(r.rating * 10) / 10 : Math.round(r.rating), votes: r.vote_count, norm: 1 - i / 19 };
      models.set(k, m);
    });
  }
  return [...models.values()].filter((m) => Object.keys(m.boards).length >= 2)
    .map((m) => ({ ...m, score: Math.round(1000 * Object.values(m.boards).reduce((a, b) => a + Math.max(-0.5, b.norm), 0) / Object.keys(m.boards).length) / 10 }))
    .sort((a, b) => b.score - a.score).slice(0, 25)
    .map((m, i) => ({ ...m, rank: i + 1, boards: Object.fromEntries(Object.entries(m.boards).map(([k, v]) => [k, { pos: v.pos, rating: v.rating, votes: v.votes }])) }));
}

// ---------- Prediction markets ----------
const PRIORITY = [/best ai model end of/i, /best ai model end of 2026/i, /next google gemini/i, /gpt.*released/i, /fable|claude.*released/i, /grok.*released/i, /agi/i, /ipo/i, /valuation/i, /arena score/i, /#1 ai model/i, /chinese/i, /humanity.?s last exam/i, /millennium prize/i, /waymo|robotaxi|tesla|optimus/i];
const RELEVANT = /\bai\b|openai|anthropic|gemini|gpt|claude|grok|fable|xai|deepseek|agi|model|arena|llm|nvidia|waymo|robotaxi|optimus|millennium prize|humanity.?s last exam|data center|perplexity|databricks|mistral/i;

const YEAR = new Date().getFullYear();
const MULT = { k: 1e3, m: 1e6, b: 1e9, t: 1e12 };
function ladderKey(name) {
  if (/^no\b|^none|^other/i.test(name)) return Infinity;
  const first = name.split(/[–—]/)[0].trim();
  if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i.test(first)) {
    const d = Date.parse(/\d{4}/.test(first) ? first : `${first} ${YEAR}`);
    if (!Number.isNaN(d)) return d;
  }
  const n = first.replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*([kmbt])?/i);
  // "$1.75–$2.0T": the unit may only appear at the end of the range.
  const unit = (n?.[2] ?? name.match(/\d\s*([kmbt])\b/i)?.[1] ?? "").toLowerCase();
  return n ? Number(n[1]) * (MULT[unit] ?? 1) : NaN;
}
function ladder(list) {
  const keys = list.map((o) => ladderKey(o.name));
  if (keys.some((k) => Number.isNaN(k))) return list;
  return list.map((o, i) => [o, keys[i]]).sort((a, b) => a[1] - b[1]).map(([o]) => o);
}

async function markets() {
  const seen = new Map();
  for (const tag of ["ai", "tech"]) {
    const list = await get(`https://gamma-api.polymarket.com/events?closed=false&active=true&tag_slug=${tag}&limit=120&order=volume&ascending=false`);
    for (const e of list) if (!seen.has(e.id) && RELEVANT.test(e.title)) seen.set(e.id, e);
  }
  const out = [];
  for (const e of seen.values()) {
    const ms = (e.markets ?? []).filter((m) => m.active && !m.closed);
    const parse = (x) => { try { return JSON.parse(x ?? "[]"); } catch { return []; } };
    let outcomes;
    if (ms.length === 1) {
      // A single market: show its own outcomes (Yes/No, or two named sides).
      const m = ms[0], names = parse(m.outcomes), prices = parse(m.outcomePrices).map(Number);
      outcomes = names.map((n, i) => ({ name: n, yes: prices[i] ?? null, change: i === 0 && m.oneDayPriceChange != null ? Number(m.oneDayPriceChange) : null, volume: Number(m.volume ?? 0) }));
    } else {
      outcomes = ms.map((m) => ({ name: m.groupItemTitle || m.question, yes: parse(m.outcomePrices).map(Number)[0] ?? null, change: m.oneDayPriceChange != null ? Number(m.oneDayPriceChange) : null, volume: Number(m.volume ?? 0) }))
        .filter((o) => o.yes != null && o.yes > 0.004);
      // "Which/who" questions read by odds; date and threshold ladders read in order.
      outcomes = /^(which|who|best|in which|what)/i.test(e.title) ? outcomes.sort((a, b) => b.yes - a.yes) : ladder(outcomes);
    }
    if (!outcomes.length) continue;
    const pr = PRIORITY.findIndex((r) => r.test(e.title));
    out.push({
      id: e.id, slug: e.slug, title: e.title, url: `https://polymarket.com/event/${e.slug}`, image: e.image || e.icon || null,
      volume: Math.round(Number(e.volume ?? 0)), volume24h: Math.round(Number(e.volume24hr ?? 0)), endDate: e.endDate ?? null,
      binary: ms.length === 1, outcomes: outcomes.filter((o) => o.yes != null).slice(0, 8), priority: pr < 0 ? 99 : pr,
    });
  }
  out.sort((a, b) => a.priority - b.priority || b.volume - a.volume);
  if (out.length < 3) throw new Error(`only ${out.length} markets`);
  write("markets.json", { generatedAt: new Date().toISOString(), source: "Polymarket", markets: out.slice(0, 40) });
  log(`markets: ${out.length} AI markets`);
}

let failed = 0;
for (const [name, fn] of [["rankings", rankings], ["markets", markets]]) {
  try { await fn(); } catch (e) { failed++; log(`${name} failed, keeping previous file: ${e.message}`); }
}
process.exit(failed === 2 ? 1 : 0);
