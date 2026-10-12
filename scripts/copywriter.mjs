#!/usr/bin/env node
// Writes SI Rumors' own article for each story: it researches the news on the web, then
// writes a headline, a one-line summary and a full body in our own voice (copy v2).
// Runs on the Mac (launchd com.sirumors.copywriter, every 20 minutes) through the shared
// bot route (~/codex-config/codex/codex-failover.py: Astra, then Claude, then Grok).
// Reads the queue the site publishes (/data/copy-queue.json), writes copy.json on the
// `copy` branch, pushes it, and asks the deploy workflow to rebuild.
// Usage: node scripts/copywriter.mjs [--max 60] [--dry]
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WT = join(ROOT, ".copy");              // git worktree of the copy branch
const FILE = join(WT, "copy.json");
const STATE = join(ROOT, ".copy-state.json"); // last run, failures (read by the health check)
const LOCK = join(tmpdir(), "sirumors-copywriter.lock");
const QUEUE = process.env.SIR_QUEUE || "https://sirumors.com/data/copy-queue.json";
const FAILOVER = join(process.env.HOME, "codex-config/codex/codex-failover.py");
const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const MAX = Number(arg("--max", 12));
const BATCH = 3;      // stories per model call (each one is researched)
const PARALLEL = 3;   // model calls at once
const DRY = process.argv.includes("--dry");
const log = (...a) => console.log(new Date().toISOString(), "[copywriter]", ...a);
const git = (...a) => execFileSync("git", ["-C", WT, ...a], { encoding: "utf8" }).trim();

function lock() {
  if (existsSync(LOCK) && Date.now() - statSync(LOCK).mtimeMs < 90 * 60000) { log("another run is active"); process.exit(0); }
  writeFileSync(LOCK, String(process.pid));
  process.on("exit", () => { try { rmSync(LOCK); } catch {} });
}

function worktree() {
  if (existsSync(join(WT, ".git"))) { try { git("pull", "-q", "--rebase", "origin", "copy"); } catch (e) { log("pull failed", e.message.split("\n")[0]); } return; }
  execFileSync("git", ["-C", ROOT, "fetch", "-q", "origin", "copy"], { stdio: "ignore" });
  execFileSync("git", ["-C", ROOT, "worktree", "add", "-f", WT, "copy"], { stdio: "ignore" });
}

const PROMPT = (items) => `You are a reporter for SI Rumors, an AI news site. For each item below, research the story on the web first: search for it, and read the company's own announcement and the best news coverage. Then write a complete news article about it in our own words.
Rules:
- This is SI Rumors' own reporting. Never name, credit or quote other publications, websites or news outlets, and never write "X reported" or "according to [outlet]". State facts you verified directly.
- Company statements may be attributed to the company or its people ("OpenAI said", "Nadella said").
- Anything the company has not confirmed must read as unconfirmed: "reportedly", "people familiar with the matter say", "is said to". Items with kind "rumor" stay rumors; never present them as confirmed.
- Only facts your research supports. No speculation, no invented numbers, dates or quotes. If research finds little, write less.
- Plain, clear, neutral US English. Short sentences. No hype, no exclamation marks, no em dashes. Never copy more than 6 words in a row from any source.
- headline: up to 90 characters, sentence case, specific, no clickbait, no outlet name, no trailing period.
- summary: one sentence, up to 200 characters, the news in plain words.
- body: 3 to 6 paragraphs of 2 to 4 sentences each, in this order: what happened; the key details (who, numbers, dates, products); the background and why it matters; what happens next. Fewer paragraphs only when facts are thin.
- Never mention SI Rumors. No links, URLs, citations, source labels or markdown in any field. Never address the reader.
Return ONLY a JSON array, one object per item in the same order: [{"id":"...","headline":"...","summary":"...","body":["...","..."]}]

Items (the title and text are starting points; outlets are where it appeared, for your research only):
${JSON.stringify(items.map((i) => ({ id: i.id, kind: i.kind, official: i.official, published: i.published ?? i.date, title: i.title, text: i.text, outlets: i.outlets.slice(0, 8) })), null, 1)}`;

function write(items) {
  const dir = join(tmpdir(), "sirumors-copywriter");
  mkdirSync(dir, { recursive: true });
  return new Promise((resolve, reject) => {
    // GCA_WORKER_PROFILE=web: live web search, no shell or file tools.
    const p = spawn("python3", [FAILOVER, "exec", "--skip-git-repo-check", "-"], { cwd: dir, env: { ...process.env, GCA_WORKER_PROFILE: "web" } });
    let out = "", err = "";
    const timer = setTimeout(() => p.kill("SIGKILL"), 15 * 60000);
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("close", (code) => {
      clearTimeout(timer);
      const m = out.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (!m) return reject(new Error(`no JSON from model (exit ${code}): ${(err || out).slice(-300)}`));
      try { resolve(JSON.parse(m[0])); } catch (e) { reject(e); }
    });
    p.stdin.end(PROMPT(items));
  });
}

// Drop citations the research step leaves behind ([label](url), 【…】, bare URLs) and em dashes.
const clean = (t) => String(t ?? "").replace(/\s*\[[^\]]*\]\([^)]*\)?/g, "").replace(/\s*【[^】]*】/g, "").replace(/\s*\(?https?:\/\/[^\s)]+\)?/g, "").replace(/\s*\(\s*\)/g, "").replace(/\s*[—–]\s*/g, ", ").replace(/\*\*|__/g, "").replace(/\s+/g, " ").trim();
function valid(c, src) {
  if (!c || c.id !== src.id) return null;
  const headline = clean(c.headline).replace(/[.]$/, "");
  const summary = clean(c.summary);
  const body = (Array.isArray(c.body) ? c.body : [c.body]).map(clean).filter((p) => p.length > 20).slice(0, 6);
  if (headline.length < 15 || headline.length > 120 || summary.length < 20 || !body.length) return null;
  const all = headline + " " + summary + " " + body.join(" ");
  if (/si rumors/i.test(all)) return null;
  // Our reporting: no outlet named or credited.
  const named = src.outlets.filter((o) => o.length > 6 && !/^(fortune|time|wired|yahoo)$/i.test(o) && !/ on X$/.test(o) && !src.companies.some((c) => o.toLowerCase().includes(c)));
  if (named.some((o) => all.toLowerCase().includes(o.toLowerCase())) || /\b(according to|reported by|as reported|first reported)\b(?! (the company|openai|anthropic|google|microsoft|nvidia|meta|xai|tesla))/i.test(all)) return null;
  // A rumor must not read as confirmed.
  if (src.kind === "rumor" && !/report|rumou?r|reportedly|said to|according|sources|leak|unconfirmed|claim/i.test(summary + body.join(" "))) return null;
  return { headline, summary, body, v: 2, date: src.date, at: new Date().toISOString() };
}

lock();
const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : { failures: 0 };
try {
  worktree();
  const store = existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")) : { items: {} };
  const q = await (await fetch(`${QUEUE}?t=${Date.now()}`, { signal: AbortSignal.timeout(30000) })).json();
  const todo = q.items.filter((i) => (store.items[i.id]?.v ?? 1) < 2).slice(0, MAX);
  log(`queue ${q.items.length}, to write ${todo.length}`);
  let added = 0, rejected = 0;
  const batches = [];
  for (let i = 0; i < todo.length; i += BATCH) batches.push(todo.slice(i, i + BATCH));
  for (let i = 0; i < batches.length; i += PARALLEL) {
    await Promise.all(batches.slice(i, i + PARALLEL).map(async (batch) => {
      try {
        const res = await write(batch);
        for (const src of batch) {
          const v = valid(res.find((c) => c?.id === src.id), src);
          if (v) { store.items[src.id] = v; added++; } else { rejected++; log("rejected", src.id, JSON.stringify(res.find((c) => c?.id === src.id))?.slice(0, 200)); }
        }
      } catch (e) { log("batch failed:", e.message); }
    }));
    log(`${added} written so far, ${rejected} rejected`);
  }
  // Keep 30 days.
  for (const [id, c] of Object.entries(store.items)) if (Date.now() - Date.parse(c.date) > 30 * 86400000) delete store.items[id];
  store.updatedAt = new Date().toISOString();
  if (DRY) { log("dry run", JSON.stringify(todo.map((t) => store.items[t.id]).filter((c) => c?.v === 2), null, 1)); process.exit(0); }
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
