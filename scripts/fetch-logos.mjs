#!/usr/bin/env node
// Downloads company and source icons once into public/logos/<slug>.png.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENT = JSON.parse(readFileSync(join(ROOT, "config/entities.json"), "utf8"));
const SRC = JSON.parse(readFileSync(join(ROOT, "config/sources.json"), "utf8"));
const out = join(ROOT, "public/logos");
mkdirSync(out, { recursive: true });
const host = (u) => new URL(u).hostname.replace(/^www\./, "");
const domains = new Map();
for (const c of ENT.companies) domains.set(c.slug, c.domain);
for (const f of SRC.feeds) { const h = host(f.url); domains.set(f.id, { "raw.githubusercontent.com": "anthropic.com", "rss.beehiiv.com": "therundown.ai" }[h] || h); }
Object.assign(Object.fromEntries([]), {});
domains.set("hn", "news.ycombinator.com"); domains.set("gn", "news.google.com"); domains.set("youtube", "youtube.com"); domains.set("github", "github.com"); domains.set("reddit", "reddit.com");
const force = process.argv.includes("--force");
for (const [slug, domain] of domains) {
  const file = join(out, `${slug}.png`);
  if (existsSync(file) && !force) continue;
  try {
    const res = await fetch(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
    if (!res.ok) throw new Error(res.status);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    console.log("ok", slug, domain);
  } catch (e) { console.log("fail", slug, domain, e.message); }
}
