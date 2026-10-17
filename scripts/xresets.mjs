#!/usr/bin/env node
// Usage-limit resets at every lab, straight from X. OpenAI: Tibo (@thsottiaux, who
// runs Codex and announces every reset) and @Codexresets_. Anthropic, Google and xAI:
// the staff who post resets plus the labs' own accounts (already collected by
// labx.mjs into data/labx.json, so run this after it). Read through the public
// fxtwitter API. Tweets accumulate in data/xresets.json so history survives past the
// timeline window; on any failure the previous file stays.
// Usage: node scripts/xresets.mjs --data data
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const DATA = process.argv.includes("--data") ? process.argv[process.argv.indexOf("--data") + 1] : "data";
const FILE = join(DATA, "xresets.json");
const log = (...a) => console.log("[xresets]", ...a);
import { ACCOUNTS, events, timeline } from "./resets-core.mjs";
export { PRODUCT } from "./resets-core.mjs";

const prev = existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")) : { tweets: {} };
const store = { ...(prev.tweets ?? {}) };
const seen = new Set(prev.accounts ?? []);
let fetched = 0;
// A few accounts at a time; a new account's first run reaches further back.
const queue = [...ACCOUNTS];
await Promise.all(Array.from({ length: 3 }, async () => {
  for (let a = queue.shift(); a; a = queue.shift()) {
    try {
      const list = await timeline(a.handle, a.pages ?? (seen.has(a.handle) ? 2 : 6));
      for (const t of list) store[t.id] = { ...t, company: a.company, name: a.name };
      fetched += list.length;
      if (list.length) seen.add(a.handle);
      log(`${a.handle}: ${list.length} tweets`);
    } catch (e) { log(`${a.handle} failed: ${e.message}`); }
  }
}));
if (!fetched) { log("no tweets fetched, keeping previous file"); process.exit(prev.fetchedAt ? 0 : 1); }
// Older Codex resets: codex-resets.com keeps a hand-checked list of Tibo's reset posts.
// We use it only as an index: each post is read from X itself and stored as Tibo's.
try {
  const md = await (await fetch("https://codex-resets.com/index.md", { headers: { "user-agent": "sirumors.com resets" }, signal: AbortSignal.timeout(30000) })).text();
  const listed = [...md.matchAll(/^### `([^`]+)` · (Regular|Banked) reset[\s\S]*?x\.com\/thsottiaux\/status\/(\d+)/gm)].map((m) => ({ at: m[1], kind: m[2].toLowerCase(), id: m[3] }));
  let added = 0;
  for (const r of listed) {
    if (store[r.id]?.curated) continue;
    if (!store[r.id]) {
      let t = null;
      for (let i = 0; i < 3 && !t; i++) {
        try { t = (await (await fetch(`https://api.fxtwitter.com/2/status/${r.id}`, { headers: { "user-agent": "sirumors.com resets" }, signal: AbortSignal.timeout(20000) })).json()).status; } catch { await new Promise((s) => setTimeout(s, 1500)); }
      }
      if (!t?.text || t.author?.screen_name?.toLowerCase() !== "thsottiaux") continue;
      store[r.id] = { id: r.id, handle: "thsottiaux", at: new Date(t.created_timestamp * 1000).toISOString(), text: t.text, url: `https://x.com/thsottiaux/status/${r.id}`, company: "openai", name: "Tibo" };
    }
    store[r.id].curated = r.kind;
    added++;
  }
  log(`codex-resets.com index: ${listed.length} listed, ${added} confirmed from Tibo's own posts`);
} catch (e) { log(`codex-resets.com index unavailable: ${e.message}`); }
// The labs' own posts (OpenAI, Claude, Grok, Gemini...), collected by labx.mjs.
try {
  const labx = JSON.parse(readFileSync(join(DATA, "labx.json"), "utf8"));
  for (const t of Object.values(labx.tweets ?? {})) {
    if (/reset/i.test(t.text)) store[t.id] = { id: t.id, handle: t.handle, at: t.at, text: t.text, url: t.url, company: t.company, name: t.name, lab: true };
  }
} catch (e) { log(`labx.json unreadable: ${e.message}`); }
// Tweets stored before every lab was tracked are Tibo's or the tracker's.
for (const t of Object.values(store)) t.company ??= "openai";
// Only reset-related tweets are worth keeping long term.
for (const [id, t] of Object.entries(store)) if (!t.curated && !/reset/i.test(t.text)) delete store[id];
const ev = events(Object.values(store));
writeFileSync(FILE, JSON.stringify({ fetchedAt: new Date().toISOString(), source: "X: the labs' own accounts, their staff, @Codexresets_", accounts: [...seen], events: ev, tweets: store }, null, 1));
const by = Object.groupBy(ev, (e) => e.company);
log(`${ev.length} resets; ${Object.entries(by).map(([c, l]) => `${c} ${l.length} (last ${l[0].date.slice(0, 10)})`).join(", ")}`);
