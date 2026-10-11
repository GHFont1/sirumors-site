#!/usr/bin/env node
// Fails the deploy if the static build is missing pages or real content.
import { readFileSync, existsSync } from "node:fs";
const must = ["index.html", "news/index.html", "rumors/index.html", "releases/index.html", "codex/index.html", "videos/index.html", "trends/index.html", "people/index.html", "c/openai/index.html", "t/robotics/index.html", "sitemap.xml"];
const missing = must.filter((p) => !existsSync(`out/${p}`));
if (missing.length) { console.error("missing pages:", missing); process.exit(1); }
const home = readFileSync("out/index.html", "utf8");
const stories = (home.match(/<article/g) || []).length;
if (!home.includes("SI") || stories < 10) { console.error(`home page has only ${stories} stories`); process.exit(1); }
const feed = JSON.parse(readFileSync("data/feed.json", "utf8"));
if (feed.items.length < 100) { console.error(`feed has only ${feed.items.length} items`); process.exit(1); }
console.log(`verified: ${must.length} key pages, ${stories} stories on home, ${feed.items.length} in feed`);
