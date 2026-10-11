#!/usr/bin/env node
// The labs' own X accounts: the primary source for what actually shipped.
// Read through the public fxtwitter API; posts accumulate in data/labx.json so
// release history survives past each timeline's window. Run before ingest.mjs,
// which treats these posts as official items (release evidence + "Official" updates).
// Usage: node scripts/labx.mjs --data data
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const DATA = process.argv.includes("--data") ? process.argv[process.argv.indexOf("--data") + 1] : "data";
const FILE = join(DATA, "labx.json");
const log = (...a) => console.log("[labx]", ...a);

export const LAB_ACCOUNTS = [
  { handle: "openai", company: "openai", name: "OpenAI" },
  { handle: "anthropicai", company: "anthropic", name: "Anthropic" },
  { handle: "claudeai", company: "anthropic", name: "Claude" },
  { handle: "googledeepmind", company: "google", name: "Google DeepMind" },
  { handle: "geminiapp", company: "google", name: "Gemini" },
  { handle: "spacexsi", company: "xai", name: "xAI" },
  { handle: "grok", company: "xai", name: "Grok" },
  { handle: "aiatmeta", company: "meta", name: "AI at Meta" },
  { handle: "deepseek_ai", company: "deepseek", name: "DeepSeek" },
  { handle: "mistralai", company: "mistral", name: "Mistral AI" },
  { handle: "tesla_optimus", company: "tesla", name: "Tesla Optimus" },
  { handle: "robotaxi", company: "tesla", name: "Tesla Robotaxi" },
  { handle: "figure_robot", company: "figure", name: "Figure" },
];

async function timeline(handle, pages = 3) {
  const out = [];
  let cursor = "";
  for (let page = 0; page < pages; page++) {
    let r = null;
    // The API sometimes answers an empty 404 for a moment; retry.
    for (let i = 0; i < 5 && !r?.results?.length; i++) {
      if (i) await new Promise((s) => setTimeout(s, 2000 * i));
      try {
        const res = await fetch(`https://api.fxtwitter.com/2/profile/${handle}/statuses${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, { headers: { "user-agent": "sirumors.com labx" }, signal: AbortSignal.timeout(30000) });
        r = await res.json();
      } catch { r = null; }
    }
    if (!r?.results?.length) break;
    out.push(...r.results);
    cursor = r.cursor?.bottom;
    if (!cursor) break;
  }
  // Own posts only: no reposts, no replies to other people.
  return out.filter((t) => t.author?.screen_name?.toLowerCase() === handle && !t.reposted_by && (!t.replying_to || t.replying_to?.screen_name?.toLowerCase() === handle));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const prev = existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")) : { tweets: {}, accounts: {} };
  const tweets = { ...(prev.tweets ?? {}) };
  const accounts = { ...(prev.accounts ?? {}) };
  let ok = 0;
  // A few accounts at a time; the first run reaches further back to seed history.
  const queue = [...LAB_ACCOUNTS];
  await Promise.all(Array.from({ length: 4 }, async () => {
    for (let a = queue.shift(); a; a = queue.shift()) {
      try {
        const list = await timeline(a.handle, accounts[a.handle]?.ok ? 2 : 6);
        for (const t of list) {
          tweets[t.id] = { id: t.id, handle: a.handle, company: a.company, name: a.name, at: new Date(t.created_timestamp * 1000).toISOString(), text: t.text, url: t.url, image: t.media?.photos?.[0]?.url ?? t.media?.videos?.[0]?.thumbnail_url ?? null, likes: t.likes ?? 0 };
        }
        if (list.length) ok++;
        accounts[a.handle] = { company: a.company, name: a.name, ok: list.length > 0 || !!accounts[a.handle]?.ok, lastFetched: list.length ? new Date().toISOString() : accounts[a.handle]?.lastFetched ?? null, count: list.length };
        log(`${a.handle}: ${list.length}`);
      } catch (e) { log(`${a.handle} failed: ${e.message}`); }
    }
  }));
  if (!ok) { log("nothing fetched, keeping previous file"); process.exit(prev.fetchedAt ? 0 : 1); }
  // Keep a year of posts.
  const cutoff = Date.now() - 365 * 86400000;
  for (const [id, t] of Object.entries(tweets)) if (Date.parse(t.at) < cutoff) delete tweets[id];
  writeFileSync(FILE, JSON.stringify({ fetchedAt: new Date().toISOString(), accountsOk: ok, accounts, tweets }, null, 0));
  log(`${ok}/${LAB_ACCOUNTS.length} accounts, ${Object.keys(tweets).length} posts stored`);
}
