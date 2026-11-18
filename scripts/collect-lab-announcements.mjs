import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { collectAnnouncements } from "./lab-announcements.mjs";

const file = "data/lab-announcements.json";
const previous = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : [];
const items = new Map(previous.filter((i) => Date.now() - Date.parse(i.date) <= 31 * 86400000).map((i) => [i.id, i]));
for (const result of await collectAnnouncements()) {
  if (result.error) {
    console.error(result.lab, result.error);
    process.exitCode = 1;
    continue;
  }
  // Reconcile this source after a successful read, retaining items if a publisher removes them from its feed.
  for (const item of result.items) items.set(item.id, item);
  console.log(result.lab, result.items.length, "recent announcements");
}
writeFileSync(file + ".tmp", JSON.stringify([...items.values()].sort((a,b) => b.date.localeCompare(a.date))));
renameSync(file + ".tmp", file);
