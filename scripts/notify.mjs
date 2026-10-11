#!/usr/bin/env node
// SI Rumors alerts: turns new releases and strong rumors into forum threads,
// on-site notifications for followers, and queued emails; sends reply emails;
// drains the email queue when an email provider key is configured.
//
// Usage: node scripts/notify.mjs [--data <dir>]
// Env: SUPABASE_SERVICE_ROLE_KEY (required), RESEND_API_KEY (optional; emails stay queued without it).

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const argData = process.argv.indexOf("--data");
const DATA = argData > -1 ? process.argv[argData + 1] : join(ROOT, "data");
const URL_ = "https://qzeygvpgdlmjbmhsfunt.supabase.co";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND = process.env.RESEND_API_KEY || "";
const FROM = process.env.ALERTS_FROM || "SI Rumors <alerts@sirumors.com>";
const SITE = "https://sirumors.com";
if (!KEY) { console.error("SUPABASE_SERVICE_ROLE_KEY missing"); process.exit(1); }

const ENT = JSON.parse(readFileSync(join(ROOT, "config/entities.json"), "utf8"));
const releases = JSON.parse(readFileSync(join(DATA, "releases.json"), "utf8"));
const rumors = existsSync(join(DATA, "rumors.json")) ? JSON.parse(readFileSync(join(DATA, "rumors.json"), "utf8")).rumors : [];
const statePath = join(DATA, "notify-state.json");
const firstRun = !existsSync(statePath);
const state = firstRun ? { releases: {}, rumors: {}, replyCursor: new Date().toISOString() } : JSON.parse(readFileSync(statePath, "utf8"));
const NOW = Date.now();
const DAY = 86400000;

async function api(path, { method = "GET", body, prefer } = {}) {
  const res = await fetch(`${URL_}/rest/v1/${path}`, {
    method,
    headers: { apikey: KEY, authorization: `Bearer ${KEY}`, "content-type": "application/json", ...(prefer ? { prefer } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}
const rpc = (fn, args) => api(`rpc/${fn}`, { method: "POST", body: args });

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const companyName = (slug) => ENT.companies.find((c) => c.slug === slug)?.name ?? slug;

function emailHtml({ kicker, title, lines, cta, ctaUrl, token, what }) {
  const unsub = `${SITE}/unsubscribe/?t=${token}&w=${what}`;
  return {
    html: `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:28px 22px;color:#0e1116">
<div style="font-size:20px;font-weight:800;letter-spacing:-.02em"><span style="color:#5b3df5">SI</span>Rumors</div>
<div style="margin-top:22px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#5b3df5">${esc(kicker)}</div>
<h1 style="font-size:22px;line-height:1.25;margin:6px 0 12px">${esc(title)}</h1>
${lines.map((l) => `<p style="color:#5b6170;margin:0 0 10px;font-size:15px">${esc(l)}</p>`).join("")}
<a href="${ctaUrl}" style="display:inline-block;margin-top:10px;background:#5b3df5;color:#fff;text-decoration:none;font-weight:700;padding:11px 18px;border-radius:10px">${esc(cta)}</a>
<p style="color:#8a90a0;font-size:12px;margin-top:28px">You follow this on SI Rumors. <a href="${SITE}/account/" style="color:#8a90a0">Email settings</a> · <a href="${unsub}" style="color:#8a90a0">Unsubscribe</a></p></div>`,
    text: `${kicker}\n\n${title}\n\n${lines.join("\n")}\n\n${cta}: ${ctaUrl}\n\nUnsubscribe: ${unsub}`,
    unsub,
  };
}

async function upsertThread(t) {
  const rows = await api("forum_threads?on_conflict=ref_key", { method: "POST", body: [t], prefer: "resolution=ignore-duplicates,return=representation" });
  if (rows?.[0]) return rows[0].id;
  const got = await api(`forum_threads?select=id&ref_key=eq.${encodeURIComponent(t.ref_key)}`);
  return got?.[0]?.id;
}

async function notifyFollowers(targets, n) {
  const followers = await rpc("event_followers", { targets });
  if (!followers.length) return 0;
  await api("notifications?on_conflict=user_id,dedupe_key", {
    method: "POST", prefer: "resolution=ignore-duplicates",
    body: followers.map((f) => ({ user_id: f.user_id, ...n })),
  });
  return followers.length;
}

async function queueEmails(targets, pref, build, dedupe) {
  const rec = await rpc("event_recipients", { targets, pref });
  if (!rec.length) return 0;
  await api("email_queue?on_conflict=dedupe_key", {
    method: "POST", prefer: "resolution=ignore-duplicates",
    body: rec.map((r) => { const m = build(r); return { user_id: r.user_id, to_email: r.email, subject: m.subject, html: m.html, text_body: m.text, dedupe_key: `${dedupe}:${r.user_id}` }; }),
  });
  return rec.length;
}

async function main() {
  let log = { threads: 0, notified: 0, queued: 0, sent: 0 };

  // Welcome thread, once.
  await upsertThread({
    ref_key: "welcome", kind: "system", category: "general", pinned: true, author_id: null,
    title: "Welcome to the SI Rumors forums",
    body: "This is the place to talk about everything on the road to superintelligence.\n\nRelease Watch gets a new thread automatically every time a lab ships something. Rumors & Leaks is for what you've heard: include your source so everyone can judge it. Be civil, no spam, no self-promotion.\n\nFollow labs, people and release lines from any page to get alerts when they ship.",
  });

  // ---- releases ----
  for (const line of releases.lines) {
    for (const r of line.releases) {
      const key = `${line.id}:${String(r.version).toLowerCase()}`;
      if (state.releases[key]) continue;
      const age = (NOW - Date.parse(r.date + "T12:00:00Z")) / DAY;
      const recent = age <= 5;
      // first run: seed threads for the last 30 days, notify nobody
      if (firstRun ? age > 30 : !recent) { state.releases[key] = "skipped"; continue; }
      const title = `${r.name} is out`;
      const body = [
        `${companyName(line.company)} released ${r.name} on ${r.date}.`,
        r.evidence ? `Confirmed by ${r.evidence.source}.` : "",
        line.medianGapDays ? `${line.name} has been shipping about every ${line.medianGapDays} days lately.` : "",
        "What do you think? First impressions, benchmarks, and what it means for the race.",
      ].filter(Boolean).join("\n\n");
      const threadId = await upsertThread({ ref_key: `release:${key}`, kind: "release", category: "release-watch", title, body, link_url: `/n/${`r-${line.id}-${r.version}`.replace(/[^a-zA-Z0-9._-]/g, "-")}/`, author_id: null });
      log.threads++;
      if (!firstRun && threadId) {
        const targets = [{ kind: "line", slug: line.id }, { kind: "company", slug: line.company }];
        const url = `/forums/thread/?id=${threadId}`;
        log.notified += await notifyFollowers(targets, { kind: "release", title: `${r.name} just shipped`, body: `${companyName(line.company)} · ${r.date}. Join the discussion.`, url, dedupe_key: `release:${key}` });
        log.queued += await queueEmails(targets, "releases", (rec) => {
          const m = emailHtml({ kicker: `${line.name} release`, title: `${r.name} just shipped`, lines: [`${companyName(line.company)} released ${r.name} on ${r.date}.`, r.evidence ? `Confirmed by ${r.evidence.source}.` : ""].filter(Boolean), cta: "See it on SI Rumors", ctaUrl: SITE + url, token: rec.unsubscribe_token, what: "releases" });
          return { subject: `${r.name} just shipped`, ...m };
        }, `release:${key}`);
      }
      state.releases[key] = new Date().toISOString();
    }
  }

  // ---- strong rumors ----
  for (const r of rumors) {
    if (!["strong", "confirmed"].includes(r.status)) continue;
    // Our own page for the rumor, never the publisher's.
    const page = `/n/s-${r.id}/`;
    if (state.rumors[r.id] === r.status) continue;
    if (firstRun || NOW - Date.parse(r.publishedAt) > 3 * DAY) { state.rumors[r.id] = r.status; continue; }
    const targets = [...r.companies.map((s) => ({ kind: "company", slug: s })), ...r.people.map((s) => ({ kind: "person", slug: s }))];
    if (!targets.length) { state.rumors[r.id] = r.status; continue; }
    const label = r.status === "confirmed" ? "Confirmed" : "Strong rumor";
    log.notified += await notifyFollowers(targets, { kind: "rumor", title: `${label}: ${r.title}`.slice(0, 200), body: `${r.source}${r.sourceCount > 1 ? ` and ${r.sourceCount - 1} more` : ""} · confidence ${r.confidence}/100`, url: page, dedupe_key: `rumor:${r.id}:${r.status}` });
    log.queued += await queueEmails(targets, "rumors", (rec) => {
      const m = emailHtml({ kicker: label, title: r.title, lines: [`Reported by ${r.source}${r.sourceCount > 1 ? ` and ${r.sourceCount - 1} more outlets` : ""}. Confidence ${r.confidence}/100.`], cta: "Read it on SI Rumors", ctaUrl: SITE + page, token: rec.unsubscribe_token, what: "rumors" });
      return { subject: `${label}: ${r.title}`.slice(0, 120), ...m };
    }, `rumor:${r.id}:${r.status}`);
    state.rumors[r.id] = r.status;
  }
  // forget rumor ids older than 30 days of tracking
  if (Object.keys(state.rumors).length > 5000) state.rumors = Object.fromEntries(Object.entries(state.rumors).slice(-2000));

  // ---- reply emails ----
  const since = state.replyCursor || new Date(NOW - 3600000).toISOString();
  const replies = await rpc("reply_email_targets", { since });
  for (const n of replies) {
    const m = emailHtml({ kicker: "Forum reply", title: n.title, lines: [n.body ?? ""], cta: "View the thread", ctaUrl: SITE + (n.url ?? "/forums/"), token: n.unsubscribe_token, what: "replies" });
    await api("email_queue?on_conflict=dedupe_key", { method: "POST", prefer: "resolution=ignore-duplicates", body: [{ to_email: n.email, subject: n.title, html: m.html, text_body: m.text, dedupe_key: `reply:${n.notification_id}` }] });
    log.queued++;
  }
  state.replyCursor = new Date(NOW - 5 * 60000).toISOString();

  // ---- send ----
  const pending = await api("email_queue?select=id,to_email,subject,html,text_body,attempts,created_at&sent_at=is.null&attempts=lt.5&order=created_at.asc&limit=80");
  if (RESEND) {
    for (const e of pending) {
      // An alert more than 3 days old is stale news: mark it skipped instead of sending.
      if (NOW - Date.parse(e.created_at) > 3 * DAY) { await api(`email_queue?id=eq.${e.id}`, { method: "PATCH", body: { attempts: 5, last_error: "expired before a sender was available" } }); continue; }
      const unsub = (e.html.match(/href="(https:\/\/sirumors\.com\/unsubscribe\/[^"]+)"/) || [])[1];
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${RESEND}`, "content-type": "application/json" },
        body: JSON.stringify({ from: FROM, to: [e.to_email], subject: e.subject, html: e.html, text: e.text_body, headers: unsub ? { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } : undefined }),
      });
      if (res.ok) { await api(`email_queue?id=eq.${e.id}`, { method: "PATCH", body: { sent_at: new Date().toISOString(), attempts: e.attempts + 1 } }); log.sent++; }
      else { await api(`email_queue?id=eq.${e.id}`, { method: "PATCH", body: { attempts: e.attempts + 1, last_error: (await res.text()).slice(0, 300) } }); }
    }
  }
  writeFileSync(statePath, JSON.stringify(state));
  console.log(`notify: ${log.threads} release threads, ${log.notified} notifications, ${log.queued} emails queued, ${log.sent} sent, ${pending.length} pending${RESEND ? "" : " (no email provider yet; queued)"}${firstRun ? " [first run: seeded, nobody notified]" : ""}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
