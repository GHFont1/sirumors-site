// Inspect public HTML independently of status.json and the last successful ingest.
import { collectAnnouncements } from "./lab-announcements.mjs";
import { readFile } from "node:fs/promises";
const local = process.argv.includes("--export");
const site = "https://sirumors.com";
const visible = (html) => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g," ").trim();
const modelKey = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
async function page(path) {
  if (local) return readFile(`out${path}index.html`, "utf8");
  const r = await fetch(site + path + "?coverage=" + Date.now(), { signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error(`${path} HTTP ${r.status}`);
  return r.text();
}
const [sources, home, releases, models] = await Promise.all([collectAnnouncements(), page("/"), page("/releases/"), page("/models/")]);
const problems = [];
const missing = [];
const articles = new Map([...releases.matchAll(/<li\b[^>]*id="lab-([a-f0-9]+)"[^>]*>([\s\S]*?)<\/li>/g)].map((m) => [m[1], visible(m[2])]));
const modelText = modelKey(visible(models.split("<main")[1]?.split("</main>")[0] ?? ""));
const items = sources.flatMap((s) => s.items ?? []).sort((a,b) => b.date.localeCompare(a.date));
for (const s of sources) {
  if (s.error) problems.push(`${s.lab} source unavailable: ${s.error}`);
}
for (const item of items) {
  if (!articles.get(item.id)?.includes(item.title)) missing.push(`Release page missing announcement: ${item.title} — ${item.url}`);
  for (const name of item.models) if (!modelText.includes(modelKey(name))) missing.push(`Models page missing ${name} — ${item.url}`);
}
// Equal timestamps may occur across labs. Accept either most recent item.
if (items.length && !items.filter((x) => x.date === items[0].date).some((i) => home.includes(`href="/releases/#lab-${i.id}"`))) missing.push("Homepage latest lab announcement is behind the official sources");
console.log(`${items.length} source announcements checked; ${articles.size} announcements in the release page.`);
for (const msg of [...problems, ...missing]) console.error(msg);
if (missing.length) process.exitCode = 2;
else if (problems.length) process.exitCode = 1;
