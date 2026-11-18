// Read-only Search Console comparison. Pass the final day of either 28-day window.
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

const day = 86400000;
const date = (time) => new Date(time).toISOString().slice(0, 10);
const end = process.argv[2] ?? date(Date.now() - 4 * day);
if (!/^\d{4}-\d{2}-\d{2}$/.test(end) || date(Date.parse(end)) !== end) throw new Error("Expected YYYY-MM-DD");
const site = "https://sirumors.com/";
const token = execFileSync("node", [join(homedir(), ".config/sirumors-google/auth.mjs")], { encoding: "utf8" }).trim();
const groups = {
  "Reset trackers": "^https://sirumors\\.com/(resets|codex|claude)/$",
  "Individual reset records": "^https://sirumors\\.com/n/x-[0-9]+/$",
};
for (const offset of [28, 0]) {
  const endMs = Date.parse(end) - offset * day;
  const startDate = date(endMs - 27 * day);
  const endDate = date(endMs);
  console.log(`\n${startDate} through ${endDate}`);
  for (const [name, expression] of Object.entries(groups)) {
    const response = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ startDate, endDate, dataState: "final", aggregationType: "byPage",
        dimensionFilterGroups: [{ filters: [{ dimension: "page", operator: "includingRegex", expression }] }] }),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`Search Console returned ${response.status}`);
    const [row] = (await response.json()).rows ?? [];
    console.log(row ? `${name}: ${row.clicks} ${row.clicks === 1 ? "click" : "clicks"} / ${row.impressions} impressions (${(row.ctr * 100).toFixed(3)}% CTR), average position ${row.position.toFixed(1)}` : `${name}: no data`);
  }
}
