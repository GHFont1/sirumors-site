#!/usr/bin/env node
// Reset alerts by web push. Reads Tibo (@thsottiaux) and @Codexresets_ every run (every minute
// on the Mac, every 5 minutes on GitHub as backup) and the Claude reset accounts every 5th
// minute, and pushes "reset coming" / "reset landed" to subscribed browsers. The insert into
// push_events is the send lock, so any number of runners can never send the same alert twice.
// Env: SUPABASE_SERVICE_ROLE_KEY, VAPID_PRIVATE_KEY. Options: --runner <name>, --dry (no sends),
// --test <endpoint|all> (send a test alert now), --no-ai (word rules only; GitHub runs this way).
// On the Mac each new post is read by the shared model route (Astra, then Claude, then Grok) with
// the account's previous posts as context, because Tibo's wording varies too much for word rules
// ("Done and dusted"). Verdicts are cached per post; the word rules are the fallback.
import webpush from "web-push";
import { ACCOUNTS, timeline, tidy } from "./resets-core.mjs";
import { judge } from "./reset-judge.mjs";

const URL_ = "https://qzeygvpgdlmjbmhsfunt.supabase.co";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VAPID_PUBLIC = "BBQzd9dEHGIE55eRYPtW2kZASxU7zcS7tU9swYqN_Fr_AfD0HJb098FL6CGgZ7wbv_xAiOAqpmbaDh886C04YYg";
const arg = (n) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : null);
const RUNNER = arg("--runner") ?? "local";
if (!/^(mac|github|local)$/.test(RUNNER)) throw new Error("--runner must be mac, github or local");
const DRY = process.argv.includes("--dry");
const log = (...a) => console.log(new Date().toISOString(), "[reset-push]", ...a);
if (!KEY || !process.env.VAPID_PRIVATE_KEY) { console.error("SUPABASE_SERVICE_ROLE_KEY and VAPID_PRIVATE_KEY are required"); process.exit(1); }
webpush.setVapidDetails("mailto:alerts@sirumors.com", VAPID_PUBLIC, process.env.VAPID_PRIVATE_KEY);

async function api(path, { method = "GET", body, prefer } = {}) {
  const res = await fetch(`${URL_}/rest/v1/${path}`, {
    method, headers: { apikey: KEY, authorization: `Bearer ${KEY}`, "content-type": "application/json", ...(prefer ? { prefer } : {}) },
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

const TOPICS = {
  codex: { name: "Codex", handles: ["thsottiaux", "codexresets_"], company: "openai", url: "/codex/", every: 1 },
  claude: { name: "Claude", handles: [...ACCOUNTS.filter((a) => a.company === "anthropic").map((a) => a.handle), "claudeai"], company: "anthropic", url: "/claude/", every: 5 },
};
const H = 3600000;

/** Send one alert to every subscriber of the topic (or the given endpoints). Drops dead subscriptions. */
async function sendAll(topic, payload, only) {
  const subs = only ?? (await api(`push_subs?select=endpoint,p256dh,auth&topics=cs.{${topic}}`));
  let sent = 0, failed = 0;
  const body = JSON.stringify(payload);
  for (let i = 0; i < subs.length; i += 50) {
    await Promise.all(subs.slice(i, i + 50).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 6 * 3600, urgency: "high" });
        sent++;
        await api(`push_subs?endpoint=eq.${encodeURIComponent(s.endpoint)}`, { method: "PATCH", body: { last_ok: new Date().toISOString(), failures: 0 } });
      } catch (e) {
        failed++;
        const gone = e.statusCode === 404 || e.statusCode === 410;
        log(`send failed (${e.statusCode ?? e.message})${gone ? ", removing subscription" : ""}`);
        if (gone) await api(`push_subs?endpoint=eq.${encodeURIComponent(s.endpoint)}`, { method: "DELETE" });
      }
    }));
  }
  return { sent, failed, subscribers: subs.length };
}

if (arg("--test")) {
  const t = arg("--test");
  const subs = t === "all" ? await api("push_subs?select=endpoint,p256dh,auth") : await api(`push_subs?select=endpoint,p256dh,auth&endpoint=eq.${encodeURIComponent(t)}`);
  log("test alert:", await sendAll("codex", { title: "SI Rumors alerts are on", body: "You'll get a push the moment Codex usage limits reset.", url: "/codex/", tag: "test" }, subs));
  process.exit(0);
}

// The backup stays quiet while the Mac watcher (which has the model check) is healthy.
if (RUNNER !== "mac") {
  const mac = (await api("push_health?select=checked_at,ok&id=eq.mac"))?.[0];
  if (mac?.ok && Date.now() - Date.parse(mac.checked_at) < 10 * 60000) {
    await api("push_health?on_conflict=id", { method: "POST", body: { id: RUNNER, checked_at: new Date().toISOString(), ok: true, note: "standby: Mac watcher healthy" }, prefer: "resolution=merge-duplicates" });
    log("standby: Mac watcher healthy");
    process.exit(0);
  }
}
const minute = Math.floor(Date.now() / 60000);
const notes = [];
let ok = true;
for (const [topic, cfg] of Object.entries(TOPICS)) {
  if (minute % cfg.every && RUNNER === "mac") continue;
  const tweets = [];
  let read = 0;
  for (const handle of cfg.handles) {
    try {
      const list = await timeline(handle, 1);
      if (list.length) read++;
      tweets.push(...list.map((t) => ({ ...t, company: cfg.company })));
    } catch (e) { log(`${handle}: ${e.message}`); }
  }
  // Codex is the alert people rely on: both of its accounts unreadable is a failed run.
  if (!read) { notes.push(`${topic}: X unreadable`); if (topic === "codex") ok = false; continue; }
  notes.push(`${topic}: ${read}/${cfg.handles.length} read`);
  tweets.sort((a, b) => a.at.localeCompare(b.at));
  // Only posts from the last 12 hours that mention a reset (or follow one up) need a verdict.
  const lately = tweets.filter((t) => Date.now() - Date.parse(t.at) < 12 * H);
  const candidates = lately.filter((t) => /reset|propagat|limits|usage|done|landed|dropped/i.test(t.text) || lately.some((x) => x.handle === t.handle && x.at < t.at && /reset/i.test(x.text)));
  const fresh = (await judge(candidates, tweets, !process.argv.includes("--no-ai"), cfg.name === "Codex" ? "ChatGPT and Codex (OpenAI)" : "Claude (Anthropic)"))
    .filter((t) => t.kind && Date.now() - Date.parse(t.at) < (t.kind === "done" ? 3 : 12) * H);
  if (!fresh.length) continue;
  const recent = await api(`push_events?select=key,kind,created_at&topic=eq.${topic}&kind=neq.test&created_at=gt.${new Date(Date.now() - 20 * H).toISOString()}`);
  for (const t of fresh) {
    const banked = t.banked;
    const flavor = t.kind === "done" ? `done:${banked ? "banked" : "full"}` : "soon";
    // One alert per reset: the announcement and its "propagated" follow-up are one reset,
    // but a banked reset on the same day as a full one is its own alert.
    if (recent.some((e) => e.key.startsWith(`${topic}:${flavor}:`) || (flavor === "soon" && e.kind === "done"))) continue;
    const quote = tidy(t.text).slice(0, 140);
    const who = t.handle === "thsottiaux" ? "Tibo" : `@${t.handle}`;
    const title = t.kind === "soon" ? `${cfg.name} reset coming` : banked ? `Banked ${cfg.name} reset is in your account` : `${cfg.name} usage limits just reset`;
    if (t.by) log(`${t.handle} ${t.id}: ${flavor} (${t.by})`);
    const ev = { key: `${topic}:${flavor}:${t.id}`, topic, kind: t.kind, tweet_id: t.id, title, body: `${who}: “${quote}”`, url: cfg.url };
    if (DRY) { log("would send", ev); continue; }
    const won = await api("push_events?on_conflict=key", { method: "POST", body: ev, prefer: "resolution=ignore-duplicates,return=representation" });
    if (!won?.length) continue; // another runner already sent it
    recent.push({ key: ev.key, kind: ev.kind });
    const r = await sendAll(topic, { title, body: ev.body, url: cfg.url, tag: ev.key });
    await api(`push_events?key=eq.${encodeURIComponent(ev.key)}`, { method: "PATCH", body: { sent: r.sent, failed: r.failed } });
    log(`sent "${title}" to ${r.sent}/${r.subscribers}`);
    notes.push(`sent ${flavor} to ${r.sent}`);
  }
}
if (!DRY) await api("push_health?on_conflict=id", { method: "POST", body: { id: RUNNER, checked_at: new Date().toISOString(), ok, note: notes.join("; ").slice(0, 300) }, prefer: "resolution=merge-duplicates" });
log(ok ? "ok" : "FAILED", notes.join("; "));
process.exit(ok ? 0 : 1);
