#!/usr/bin/env node
// Fails the deploy if the static build is missing pages or real content.
import { readFileSync, existsSync } from "node:fs";
const must = ["index.html", "news/index.html", "rumors/index.html", "releases/index.html", "codex/index.html", "resets/index.html", "models/index.html", "videos/index.html", "trends/index.html", "people/index.html", "c/openai/index.html", "t/robotics/index.html", "rankings/index.html", "odds/index.html", "sitemap.xml"];
const missing = must.filter((p) => !existsSync(`out/${p}`));
if (missing.length) { console.error("missing pages:", missing); process.exit(1); }
const home = readFileSync("out/index.html", "utf8");
const stories = (home.match(/<article/g) || []).length;
if (!home.includes("SI") || stories < 10) { console.error(`home page has only ${stories} stories`); process.exit(1); }
const feed = JSON.parse(readFileSync("data/feed.json", "utf8"));
if (feed.items.length < 100) { console.error(`feed has only ${feed.items.length} items`); process.exit(1); }
const rk = existsSync("data/rankings.json") ? JSON.parse(readFileSync("data/rankings.json", "utf8")) : { boards: [] };
const mk = existsSync("data/markets.json") ? JSON.parse(readFileSync("data/markets.json", "utf8")) : { markets: [] };
const xr = existsSync("data/xresets.json") ? JSON.parse(readFileSync("data/xresets.json", "utf8")) : { events: [] };
if (xr.events.length < 3) { console.error(`only ${xr.events.length} resets from X`); process.exit(1); }
if (new Set(xr.events.map((e) => e.company ?? "openai")).size < 2) { console.error("resets cover fewer than 2 labs"); process.exit(1); }
if ((rk.frontier ?? []).length < 5) { console.error(`only ${(rk.frontier ?? []).length} frontier models`); process.exit(1); }
for (const m of rk.frontier.slice(0, 5)) if (!existsSync(`out/models/${m.slug}/index.html`)) { console.error(`missing model page ${m.slug}`); process.exit(1); }
if (rk.boards.length < 4 || mk.markets.length < 3) { console.error(`rankings ${rk.boards.length} boards, ${mk.markets.length} markets`); process.exit(1); }
// Every link stays on the site: no page may link out to another website.
import { readdirSync, statSync } from "node:fs";
const walk = (d) => readdirSync(d).flatMap((f) => { const p = `${d}/${f}`; return statSync(p).isDirectory() ? walk(p) : p.endsWith(".html") ? [p] : []; });
const outbound = [];
for (const f of walk("out")) for (const m of readFileSync(f, "utf8").matchAll(/<a [^>]*href="(https?:\/\/[^"]+)"/g)) if (!/^https?:\/\/(www\.)?sirumors\.com/.test(m[1])) outbound.push(`${f}: ${m[1]}`);
if (outbound.length) { console.error(`${outbound.length} links leave the site, e.g.`, outbound.slice(0, 5)); process.exit(1); }
console.log(`verified: ${must.length} key pages, ${stories} stories on home, ${feed.items.length} in feed`);
