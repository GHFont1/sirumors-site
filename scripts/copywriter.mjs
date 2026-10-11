#!/usr/bin/env node
// Writes SI Rumors' own version of each story: headline, one-line summary, short body.
// Runs on the Mac (launchd com.sirumors.copywriter, every 20 minutes) through the shared
// bot route (~/codex-config/codex/codex-failover.py: Astra, then Claude, then Grok).
// Reads the queue the site publishes (/data/copy-queue.json), writes copy.json on the
// `copy` branch, pushes it, and asks the deploy workflow to rebuild.
// Usage: node scripts/copywriter.mjs [--max 60] [--dry]
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WT = join(ROOT, ".copy");              // git worktree of the copy branch
const FILE = join(WT, "copy.json");
const STATE = join(ROOT, ".copy-state.json"); // last run, failures (read by the health check)
const LOCK = join(tmpdir(), "sirumors-copywriter.lock");
const QUEUE = process.env.SIR_QUEUE || "https://sirumors.com/data/copy-queue.json";
const FAILOVER = join(process.env.HOME, "codex-config/codex/codex-failover.py");
const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const MAX = Number(arg("--max", 60));
const BATCH = 12;
const DRY = process.argv.includes("--dry");
const log = (...a) => console.log(new Date().toISOString(), "[copywriter]", ...a);
const git = (...a) => execFileSync("git", ["-C", WT, ...a], { encoding: "utf8" }).trim();

function lock() {
  if (existsSync(LOCK) && Date.now() - statSync(LOCK).mtimeMs < 30 * 60000) { log("another run is active"); process.exit(0); }
  writeFileSync(LOCK, String(process.pid));
  process.on("exit", () => { try { rmSync(LOCK); } catch {} });
}

function worktree() {
  if (existsSync(join(WT, ".git"))) { try { git("pull", "-q", "--rebase", "origin", "copy"); } catch (e) { log("pull failed", e.message.split("\n")[0]); } return; }
  execFileSync("git", ["-C", ROOT, "fetch", "-q", "origin", "copy"], { stdio: "ignore" });
  execFileSync("git", ["-C", ROOT, "worktree", "add", "-f", WT, "copy"], { stdio: "ignore" });
}

const PROMPT = (items) => `You write for SI Rumors, an AI news site. Rewrite each item below in our own words.
Rules:
- Use ONLY the facts given (title, text, outlet names). Do not add facts, numbers, dates, quotes or context that are not there.
- Original wording: no phrase of more than 6 words copied from the source. Plain, clear, neutral US English. Short sentences. No hype, no exclamation marks, no em dashes.
- Rumors (kind "rumor") stay rumors: say who reported it ("according to reports", "X reports") and never present it as confirmed.
- Official posts (official true) are the company speaking about itself: "OpenAI says", "Anthropic announced".
- headline: up to 90 characters, sentence case, no clickbait, no outlet name, no trailing period.
- summary: one sentence, up to 200 characters.
- body: 1 to 3 short paragraphs (each 1 to 3 sentences) that explain what happened and why it matters, only as far as the facts allow. If the text is thin, write one paragraph.
- Never mention SI Rumors, never include links or URLs, never address the reader.
Return ONLY a JSON array, one object per item in the same order: [{"id":"...","headline":"...","summary":"...","body":["..."]}]

Items:
${JSON.stringify(items.map((i) => ({ id: i.id, kind: i.kind, official: i.official, title: i.title, text: i.text, outlets: i.outlets.slice(0, 6) })), null, 1)}`;

function write(items) {
  const dir = join(tmpdir(), "sirumors-copywriter");
  mkdirSync(dir, { recursive: true });
  const r = spawnSync("python3", [FAILOVER, "exec", "--skip-git-repo-check", "-"], { cwd: dir, input: PROMPT(items), encoding: "utf8", timeout: 6 * 60000, maxBuffer: 20 * 1024 * 1024 });
  const out = r.stdout ?? "";
  const m = out.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (!m) throw new Error(`no JSON from model (exit ${r.status}): ${(r.stderr || out).slice(-300)}`);
  return JSON.parse(m[0]);
}

const clean = (t) => String(t ?? "").replace(/https?:\/\/\S+/g, "").replace(/\s*[—–]\s*/g, ", ").replace(/\s+/g, " ").trim();
function valid(c, src) {
  if (!c || c.id !== src.id) return null;
  const headline = clean(c.headline).replace(/[.]$/, "");
  const summary = clean(c.summary);
  const body = (Array.isArray(c.body) ? c.body : [c.body]).map(clean).filter((p) => p.length > 20).slice(0, 3);
  if (headline.length < 15 || headline.length > 120 || summary.length < 20 || !body.length) return null;
  if (/si rumors/i.test(headline + summary + body.join(" "))) return null;
  // A rumor must not read as confirmed.
  if (src.kind === "rumor" && !/report|rumou?r|reportedly|said to|according|sources|leak|unconfirmed|claim/i.test(summary + body.join(" "))) return null;
  return { headline, summary, body, date: src.date, at: new Date().toISOString() };
}

lock();
const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : { failures: 0 };
try {
  worktree();
  const store = existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")) : { items: {} };
  const q = await (await fetch(`${QUEUE}?t=${Date.now()}`, { signal: AbortSignal.timeout(30000) })).json();
  const todo = q.items.filter((i) => !store.items[i.id]).slice(0, MAX);
  log(`queue ${q.items.length}, new ${todo.length}`);
  let added = 0, rejected = 0;
  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH);
    try {
      const res = write(batch);
      for (const src of batch) {
        const v = valid(res.find((c) => c?.id === src.id), src);
        if (v) { store.items[src.id] = v; added++; } else rejected++;
      }
      log(`batch ${i / BATCH + 1}: ${added} written so far, ${rejected} rejected`);
    } catch (e) { log("batch failed:", e.message); }
  }
  // Keep 30 days.
  for (const [id, c] of Object.entries(store.items)) if (Date.now() - Date.parse(c.date) > 30 * 86400000) delete store.items[id];
  store.updatedAt = new Date().toISOString();
  if (DRY) { log("dry run", JSON.stringify(Object.entries(store.items).slice(-2), null, 1)); process.exit(0); }
  if (todo.length && !added) throw new Error(`nothing written from ${todo.length} queued items`);
  writeFileSync(FILE, JSON.stringify(store));
  if (added) {
    git("add", "copy.json");
    git("-c", "user.name=sirumors-copywriter", "-c", "user.email=sirumors-bot@users.noreply.github.com", "commit", "-qm", `copy: ${added} stories`);
    git("push", "-q", "origin", "HEAD:copy");
    // Rebuild now unless a deploy is already running or queued.
    const busy = execFileSync("gh", ["run", "list", "-R", "GHFont1/sirumors-site", "--workflow", "update.yml", "--limit", "3", "--json", "status", "-q", '[.[] | select(.status != "completed")] | length'], { encoding: "utf8" }).trim();
    if (busy === "0") execFileSync("gh", ["workflow", "run", "update.yml", "-R", "GHFont1/sirumors-site"]);
  }
  log(`done: ${added} written, ${rejected} rejected, ${Object.keys(store.items).length} stored`);
  writeFileSync(STATE, JSON.stringify({ lastRun: new Date().toISOString(), lastSuccess: new Date().toISOString(), failures: 0, added, queue: q.items.length }));
} catch (e) {
  log("FAILED:", e.message);
  const failures = (state.failures ?? 0) + 1;
  writeFileSync(STATE, JSON.stringify({ ...state, lastRun: new Date().toISOString(), failures, error: e.message.slice(0, 300) }));
  // Three failed runs in a row (an hour): say so on this Mac. The lane keeps retrying.
  if (failures % 3 === 0) spawnSync("osascript", ["-e", `display notification "${e.message.slice(0, 120).replace(/"/g, "'")}" with title "SI Rumors copywriter failing (${failures} runs)"`]);
  process.exit(1);
}
