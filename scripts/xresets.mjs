#!/usr/bin/env node
// Codex / ChatGPT usage-limit resets, straight from X: Tibo (@thsottiaux, who runs
// Codex at OpenAI and announces every reset) and @Codexresets_ (a tracker account).
// Read through the public fxtwitter API. Tweets accumulate in data/xresets.json so
// history survives past the timeline window; on any failure the previous file stays.
// Usage: node scripts/xresets.mjs --data data
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const DATA = process.argv.includes("--data") ? process.argv[process.argv.indexOf("--data") + 1] : "data";
const FILE = join(DATA, "xresets.json");
const log = (...a) => console.log("[xresets]", ...a);
const ACCOUNTS = [
  { handle: "thsottiaux", name: "Tibo", trust: 2 },
  { handle: "codexresets_", name: "Codex Updates", trust: 1 },
];

async function timeline(handle) {
  const out = [];
  let cursor = "";
  for (let page = 0; page < 8; page++) {
    let r = null;
    // The API sometimes answers an empty 404 for a moment; retry.
    for (let i = 0; i < 6 && !r?.results?.length; i++) {
      if (i) await new Promise((s) => setTimeout(s, 2500 * i));
      try {
        const res = await fetch(`https://api.fxtwitter.com/2/profile/${handle}/statuses${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, { headers: { "user-agent": "sirumors.com resets" }, signal: AbortSignal.timeout(30000) });
        r = await res.json();
      } catch { r = null; }
    }
    if (!r?.results?.length) break;
    out.push(...r.results);
    cursor = r.cursor?.bottom;
    if (!cursor) break;
  }
  return out.filter((t) => t.author?.screen_name?.toLowerCase() === handle && !t.reposted_by)
    .map((t) => ({ id: t.id, handle, at: new Date(t.created_timestamp * 1000).toISOString(), text: t.text, url: t.url, reply: !!t.replying_to }));
}

// What a tweet says about a reset.
const NOT = /can.?t really give|didn.?t get the reset|from there onwards|or a reset\b|ship a full reset|possible codex reset|where is the reset|will get free codex resets|getting worse|after the latest reset|before the reset|until the codex usage reset|resets? every ?day/i;
const DONE = /propagated|reset has (finally )?landed|reset just dropped|just (reset|rested)|^day \d+\s*\/\s*reset|loading a banked reset|demands a reset|a reset and a quick update/i;
const SOON = /(global )?reset (landing|coming|by eod)|we.?ll reset usage limits|promised a reset|announced a new (codex )?reset|reset is coming/i;
function classify(t) {
  if (!/reset/i.test(t.text) || NOT.test(t.text)) return null;
  if (DONE.test(t.text)) return "done";
  if (SOON.test(t.text)) return "soon";
  return null;
}

const tidy = (s) => s.replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim();
function headline(list) {
  const banked = list.some((t) => /banked reset/i.test(t.text));
  const day = list.map((t) => t.text.match(/^day (\d+)\s*\//i)?.[1]).find(Boolean);
  const pro = list.find((t) => /pro 500/i.test(t.text));
  if (banked) return "Banked reset loaded into every paid account";
  if (list.some((t) => /vote|demands a reset/i.test(t.text))) return "Community vote: full usage reset for paid plans";
  if (day) return `Day ${day} of "28 Days": full usage reset for paid plans`;
  if (list.some((t) => /all paid|paid users|paid chatgpt/i.test(t.text))) return "Global usage reset for all paid ChatGPT and Codex plans";
  if (pro) return "Usage reset (Pro 500 follow-up)";
  return "Global Codex usage reset";
}

function events(tweets) {
  const hits = tweets.map((t) => ({ ...t, kind: classify(t) })).filter((t) => t.kind).sort((a, b) => a.at.localeCompare(b.at));
  const groups = [];
  for (const t of hits) {
    const g = groups[groups.length - 1];
    // An announcement and its "propagated" follow-up belong to one reset.
    if (g && Date.parse(t.at) - Date.parse(g[g.length - 1].at) < 20 * 3600000 && !(g.some((x) => x.kind === "done") && /banked/i.test(t.text) !== g.some((x) => /banked/i.test(x.text)))) g.push(t);
    else groups.push([t]);
  }
  return groups.map((g) => {
    const trust = (t) => ACCOUNTS.find((a) => a.handle === t.handle)?.trust ?? 0;
    const src = [...g].sort((a, b) => trust(b) - trust(a) || b.text.length - a.text.length)[0];
    const done = g.find((t) => t.kind === "done");
    return {
      id: `x-${g[0].id}`, product: "Codex", company: "OpenAI",
      date: (done ?? g[0]).at, announcedAt: g[0].at, status: done ? "done" : "coming",
      banked: g.some((t) => /banked/i.test(t.text)),
      title: headline(g), quote: tidy(src.text).slice(0, 220), url: src.url, by: src.handle,
      tweets: g.map((t) => ({ handle: t.handle, url: t.url, at: t.at })),
    };
  }).reverse();
}

const prev = existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")) : { tweets: {} };
const store = { ...(prev.tweets ?? {}) };
let fetched = 0;
for (const a of ACCOUNTS) {
  try {
    const list = await timeline(a.handle);
    for (const t of list) store[t.id] = t;
    fetched += list.length;
    log(`${a.handle}: ${list.length} tweets`);
  } catch (e) { log(`${a.handle} failed: ${e.message}`); }
}
if (!fetched) { log("no tweets fetched, keeping previous file"); process.exit(prev.fetchedAt ? 0 : 1); }
// Only reset-related tweets are worth keeping long term.
for (const [id, t] of Object.entries(store)) if (!/reset/i.test(t.text)) delete store[id];
const ev = events(Object.values(store));
writeFileSync(FILE, JSON.stringify({ fetchedAt: new Date().toISOString(), source: "X: @thsottiaux, @Codexresets_", events: ev, tweets: store }, null, 1));
log(`${ev.length} resets; latest ${ev[0]?.date} (${ev[0]?.status})`);
