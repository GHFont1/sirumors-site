#!/usr/bin/env node
// Daily search submissions for sirumors.com (launchd com.sirumors.search-submit on this Mac).
// Bing: up to its daily URL quota (100 for a new site) through the Webmaster API, newest
// articles first, plus the three sitemaps. Google: resubmits the sitemaps through Search
// Console once ~/.config/sirumors-google/tokens.json exists. State: ~/.config/sirumors-search/.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
const HOME = process.env.HOME;
const DIR = `${HOME}/.config/sirumors-search`;
mkdirSync(DIR, { recursive: true });
const STATE = `${DIR}/state.json`;
const SITE = "https://sirumors.com/";
const MAPS = ["sitemap.xml", "news-sitemap.xml", "feed.xml"].map((f) => SITE + f);
const BING_KEY = JSON.parse(readFileSync(`${HOME}/.config/gca-bing-webmaster-api.json`, "utf8")).apikey;
const BING = "https://ssl.bing.com/webmaster/api.svc/json";
const log = (...a) => console.log(new Date().toISOString(), "[search-submit]", ...a);
const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : { bing: {}, failures: 0 };
const bing = async (method, body) => {
  const r = await fetch(`${BING}/${method}?apikey=${BING_KEY}`, { method: body ? "POST" : "GET", headers: { "Content-Type": "application/json; charset=utf-8" }, body: body && JSON.stringify(body), signal: AbortSignal.timeout(60000) });
  const t = await r.text();
  if (!r.ok) throw new Error(`Bing ${method} ${r.status}: ${t.slice(0, 200)}`);
  return JSON.parse(t || "{}").d;
};
const out = { at: new Date().toISOString() };
try {
  // Newest first: home and section pages, then article pages by date.
  const xml = await (await fetch(`${SITE}sitemap.xml?t=${Date.now()}`, { signal: AbortSignal.timeout(30000) })).text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)].map((m) => ({ u: m[1], d: m[2] }));
  if (urls.length < 50) throw new Error(`sitemap has only ${urls.length} URLs`);
  const fresh = urls.filter((x) => !state.bing[x.u]).sort((a, b) => (a.u.includes("/n/") ? 1 : 0) - (b.u.includes("/n/") ? 1 : 0) || b.d.localeCompare(a.d));
  const left = await (async () => { const r = await fetch(`${BING}/GetUrlSubmissionQuota?apikey=${BING_KEY}&siteUrl=${encodeURIComponent(SITE)}`, { signal: AbortSignal.timeout(30000) }); return (await r.json()).d?.DailyQuota ?? 0; })();
  const batch = fresh.slice(0, left);
  if (batch.length) {
    await bing("SubmitUrlBatch", { siteUrl: SITE, urlList: batch.map((x) => x.u) });
    for (const x of batch) state.bing[x.u] = out.at;
  }
  for (const f of MAPS) await bing("SubmitFeed", { siteUrl: SITE, feedUrl: f });
  out.bing = { sent: batch.length, quotaLeft: left - batch.length, waiting: fresh.length - batch.length };
  log(`Bing: sent ${batch.length} URLs (${fresh.length - batch.length} still waiting), sitemaps resubmitted`);

  // Google: resubmit the sitemaps once the Search Console token exists.
  if (existsSync(`${HOME}/.config/sirumors-google/tokens.json`)) {
    const token = execFileSync("node", [`${HOME}/.config/sirumors-google/auth.mjs`], { encoding: "utf8" }).trim();
    const prop = encodeURIComponent(state.googleProperty ?? SITE);
    for (const f of MAPS.slice(0, 2)) {
      const r = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${prop}/sitemaps/${encodeURIComponent(f)}`, { method: "PUT", headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000) });
      if (!r.ok) throw new Error(`Google sitemap ${f}: ${r.status} ${(await r.text()).slice(0, 200)}`);
    }
    out.google = { sitemaps: "resubmitted" };
    log("Google: sitemaps resubmitted");
    // Daily Search Console numbers (clicks, impressions, position) kept in state.gsc so progress is visible.
    try {
      const day = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
      const q = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${prop}/searchAnalytics/query`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ startDate: "2026-10-01", endDate: day, dimensions: ["date"] }), signal: AbortSignal.timeout(30000) });
      const rows = (await q.json()).rows ?? [];
      state.gsc = Object.fromEntries(rows.map((r) => [r.keys[0], { clicks: r.clicks, impressions: r.impressions, position: Math.round(r.position * 10) / 10 }]));
      const w = rows.slice(-7);
      log(`Google: last 7 final days ${w.reduce((a, r) => a + r.clicks, 0)} clicks, ${w.reduce((a, r) => a + r.impressions, 0)} impressions`);
    } catch (e) { log("Google stats skipped:", e.message); }
  } else out.google = { pending: "Search Console consent not given yet" };
  state.failures = 0;
  state.lastSuccess = out.at;
} catch (e) {
  state.failures = (state.failures ?? 0) + 1;
  out.error = e.message;
  log("FAILED:", e.message);
  if (state.failures % 3 === 0) spawnSync("osascript", ["-e", `display notification "${e.message.slice(0, 120).replace(/"/g, "'")}" with title "SI Rumors search submit failing (${state.failures} runs)"`]);
}
state.last = out;
writeFileSync(STATE, JSON.stringify(state, null, 1));
process.exit(out.error ? 1 : 0);
