#!/usr/bin/env node
// Tells Bing (and the other IndexNow engines: Yandex, Seznam, Naver) about new and
// changed pages right after each deploy, so new stories are crawled in minutes.
//   node scripts/indexnow.mjs prepare  (before upload: diff the new sitemap against the live
//                                        site's last state, write out/indexnow-state.json)
//   node scripts/indexnow.mjs submit   (after deploy: send the changed URLs)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const KEY = "3e9dbe790c4e5cdb0cfc3ca7e7516d94";
const HOST = "sirumors.com";
const PENDING = ".indexnow-pending.json";
const log = (...a) => console.log("[indexnow]", ...a);

if (process.argv[2] === "prepare") {
  const xml = readFileSync("out/sitemap.xml", "utf8");
  const now = Object.fromEntries([...xml.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)].map((m) => [m[1], m[2]]));
  let prev = {};
  try { prev = (await (await fetch(`https://${HOST}/indexnow-state.json?t=${Date.now()}`, { signal: AbortSignal.timeout(20000) })).json()).urls ?? {}; } catch { log("no previous state; sending new article pages only"); }
  const first = !Object.keys(prev).length;
  // Article pages always count as new the first time; section pages only when their lastmod changes and not more than hourly.
  const changed = Object.keys(now).filter((u) => (first ? u.includes("/n/") || u === `https://${HOST}/` : !prev[u] || (u.includes("/n/") ? false : Date.parse(now[u]) - Date.parse(prev[u]) >= 3600000)));
  const keep = Object.fromEntries(Object.entries(now).map(([u, d]) => [u, changed.includes(u) || !prev[u] ? d : prev[u]]));
  writeFileSync("out/indexnow-state.json", JSON.stringify({ at: new Date().toISOString(), urls: keep }));
  writeFileSync(PENDING, JSON.stringify(changed.slice(0, 10000)));
  log(`${Object.keys(now).length} URLs in sitemap, ${changed.length} to send`);
} else if (process.argv[2] === "submit") {
  const urlList = existsSync(PENDING) ? JSON.parse(readFileSync(PENDING, "utf8")) : [];
  if (!urlList.length) { log("nothing to send"); process.exit(0); }
  const r = await fetch("https://api.indexnow.org/indexnow", { method: "POST", headers: { "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList }), signal: AbortSignal.timeout(30000) });
  log(`sent ${urlList.length}: HTTP ${r.status}`);
  if (r.status >= 400 && r.status !== 429) process.exit(1);
}
