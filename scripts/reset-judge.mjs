// Is this post a reset? Each new post is read by the shared model route (Astra, then Claude,
// then Grok) with the account's earlier posts as context; verdicts are cached per post in
// ~/.config/sirumors-push/verdicts.json. Without the model (GitHub runners) the word rules decide.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { classify } from "./resets-core.mjs";

const H = 3600000;
const FAILOVER = join(process.env.HOME, "codex-config/codex/codex-failover.py");
const CACHE_DIR = process.env.SIR_PUSH_CACHE || join(process.env.HOME, ".config/sirumors-push");
const CACHE = join(CACHE_DIR, "verdicts.json");
const log = (...a) => console.log(new Date().toISOString(), "[reset-judge]", ...a);

export const PROMPT = (items) => `You decide whether posts on X announce a usage-limit reset for ${items[0].product}.
A reset means the lab gives every paid user (or all users) fresh usage limits at once. Some resets are "banked": a reset
saved into accounts that users can use whenever they choose.
For each item, read the target post together with the account's earlier posts (context) and answer:
- "done": the post says a reset has now happened or finished rolling out (e.g. "Reset all propagated", "Done and dusted"
  right after announcing a reset, "we are resetting usage for all paid users", "brand new usage for all users").
- "banked": the post says a banked reset has now been given or loaded into accounts.
- "soon": the post announces a reset that has not happened yet ("reset landing tomorrow 10am PST", "we'll reset limits").
- "none": anything else: questions, jokes, replies about someone's own limits, talk about past resets, polls, hints without a commitment.
Return ONLY a JSON array in the same order: [{"id":"...","verdict":"done|banked|soon|none"}]

Items:
${JSON.stringify(items.map((i) => ({ id: i.id, account: "@" + i.handle, posted: i.at, target_post: i.text, earlier_posts: i.context })), null, 1)}`;

export function askModel(items) {
  const dir = join(tmpdir(), "sirumors-reset-push");
  mkdirSync(dir, { recursive: true });
  return new Promise((resolve, reject) => {
    const p = spawn("python3", [FAILOVER, "exec", "--skip-git-repo-check", "-"], { cwd: dir, env: { ...process.env, GCA_WORKER_PROFILE: "text" } });
    let out = "", err = "";
    const timer = setTimeout(() => p.kill("SIGKILL"), 4 * 60000);
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("close", (code) => {
      clearTimeout(timer);
      const m = out.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (!m) return reject(new Error(`no JSON from model (exit ${code}): ${(err || out).slice(-200)}`));
      try { resolve(JSON.parse(m[0])); } catch (e) { reject(e); }
    });
    p.stdin.end(PROMPT(items));
  });
}

/** done / soon / null for each post: cached model verdicts on the Mac, word rules otherwise. */
export async function judge(posts, all, useModel, product) {
  const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};
  const ask = useModel && existsSync(FAILOVER) ? posts.filter((t) => !cache[t.id]) : [];
  if (ask.length) {
    try {
      const items = ask.map((t) => ({ ...t, product, context: all.filter((x) => x.handle === t.handle && x.at < t.at && Date.parse(t.at) - Date.parse(x.at) < 48 * H).slice(-5).map((x) => ({ posted: x.at, text: x.text })) }));
      for (const v of await askModel(items)) if (ask.some((t) => t.id === v.id) && ["done", "banked", "soon", "none"].includes(v.verdict)) cache[v.id] = { verdict: v.verdict, at: new Date().toISOString() };
      mkdirSync(CACHE_DIR, { recursive: true });
      for (const [id, v] of Object.entries(cache)) if (Date.now() - Date.parse(v.at) > 14 * 24 * H) delete cache[id];
      writeFileSync(CACHE, JSON.stringify(cache, null, 1));
    } catch (e) { log("model check failed, using word rules:", e.message); }
  }
  return posts.map((t) => {
    const v = cache[t.id]?.verdict;
    if (v) return { ...t, kind: v === "none" ? null : v === "soon" ? "soon" : "done", banked: v === "banked", by: "model" };
    const kind = classify(t);
    return { ...t, kind, banked: /banked|save and use|whenever you (choose|want)/i.test(t.text), by: "rules" };
  });
}

