// Shared by xresets.mjs (every 30 minutes, full history) and reset-push.mjs (every minute,
// push alerts): the X accounts, the fxtwitter reader and what counts as a reset.
export const ACCOUNTS = [
  { handle: "thsottiaux", name: "Tibo", company: "openai", trust: 2, pages: 8 },
  { handle: "codexresets_", name: "Codex Updates", company: "openai", trust: 1, pages: 8 },
  { handle: "alexalbert__", name: "Alex Albert", company: "anthropic", trust: 1 },
  { handle: "trq212", name: "Thariq", company: "anthropic", trust: 1 },
  { handle: "bcherny", name: "Boris Cherny", company: "anthropic", trust: 1 },
  { handle: "_catwu", name: "Cat Wu", company: "anthropic", trust: 1 },
  { handle: "officiallogank", name: "Logan Kilpatrick", company: "google", trust: 1 },
  { handle: "geminicli", name: "Gemini CLI", company: "google", trust: 1 },
  { handle: "antigravity", name: "Antigravity", company: "google", trust: 1 },
];
export const PRODUCT = { openai: "ChatGPT & Codex", anthropic: "Claude", google: "Gemini", xai: "Grok", meta: "Meta AI", deepseek: "DeepSeek", mistral: "Mistral" };

export async function timeline(handle, pages) {
  const out = [];
  let cursor = "";
  for (let page = 0; page < pages; page++) {
    let r = null;
    // The API sometimes answers an empty 404 for a moment; retry.
    for (let i = 0; i < 6 && !r?.results?.length; i++) {
      if (i) await new Promise((s) => setTimeout(s, 2500 * i));
      try {
        const res = await fetch(`https://api.fxtwitter.com/2/profile/${handle}/statuses${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, { headers: { "user-agent": "sirumors.com resets" }, signal: AbortSignal.timeout(30000) });
        r = await res.json();
      } catch { r = null; }
    }
    if (!r?.results?.length) break;
    out.push(...r.results);
    cursor = r.cursor?.bottom;
    if (!cursor) break;
  }
  return out.filter((t) => t.author?.screen_name?.toLowerCase() === handle && !t.reposted_by)
    .map((t) => ({ id: t.id, handle, at: new Date(t.created_timestamp * 1000).toISOString(), text: t.text, url: t.url, reply: !!t.replying_to }));
}

// What a tweet says about a reset. Tibo's Codex posts have their own wording;
// everyone else says "we've reset usage limits" or "a rate limit reset".
const NOT = /can.?t really give|didn.?t get the reset|from there onwards|or a reset\b|ship a full reset|possible codex reset|where is the reset|will get free codex resets|getting worse|after the latest reset|before the reset|until the codex usage reset|resets? every ?day/i;
const DONE = /propagated|reset has (finally )?landed|reset just dropped|just (reset|rested)|^day \d+\s*\/\s*reset|loading a banked reset|demands a reset|a reset and a quick update/i;
const SOON = /(global )?reset (landing|coming|by eod)|we.?ll reset usage limits|promised a reset|announced a new (codex )?reset|reset is coming/i;
const GEN = /\b(we(.ve| have)? (also |just )?reset|reset (all |your |usage |rate |the )*limits|limits (are|have been|were) (now )?reset|rate.?limit reset|usage reset|reset tokens?)\b/i;
const BANKED = /banked|save and use|whenever you (choose|want)|reset token/i;
export function classify(t) {
  if (t.curated) return "done";
  if (!/reset/i.test(t.text) || NOT.test(t.text)) return null;
  if (t.company !== "openai" || !["thsottiaux", "codexresets_"].includes(t.handle)) return GEN.test(t.text) && !/\?\s*$/.test(t.text.trim()) ? "done" : null;
  if (DONE.test(t.text)) return "done";
  if (SOON.test(t.text)) return "soon";
  return null;
}

export const tidy = (s) => s.replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim();
export function headline(list) {
  const co = list[0].company;
  if (co !== "openai") {
    const p = PRODUCT[co] ?? co;
    // The launch it came with, when the post names one ("during the Grok 4.6 launch").
    const why = list.map((t) => t.text.match(/\b(Grok \d+(?:\.\d+)?|Grok Build|Gemini \d+(?:\.\d+)?(?: \w+)?|Claude (?:Opus|Sonnet|Haiku|Fable) \d+(?:\.\d+)?|(?:Opus|Sonnet|Fable) \d+(?:\.\d+)?|Fable)\b/)?.[1]).find(Boolean);
    const base = list.some((t) => BANKED.test(t.text)) ? `${p}: a banked usage reset you can use any time` : `${p} usage limits reset for all users`;
    return why ? `${base} (${why})` : base;
  }
  const banked = list.some((t) => t.curated === "banked" || /banked reset/i.test(t.text));
  const day = list.map((t) => t.text.match(/^day (\d+)\s*\//i)?.[1]).find(Boolean);
  const pro = list.find((t) => /pro 500/i.test(t.text));
  if (banked) return "Banked reset loaded into every paid account";
  if (list.some((t) => /vote|demands a reset/i.test(t.text))) return "Community vote: full usage reset for paid plans";
  if (day) return `Day ${day} of "28 Days": full usage reset for paid plans`;
  if (list.some((t) => /all paid|paid users|paid chatgpt/i.test(t.text))) return "Global usage reset for all paid ChatGPT and Codex plans";
  if (pro) return "Usage reset (Pro 500 follow-up)";
  return "Global Codex usage reset";
}

const isBanked = (t) => t.curated === "banked" || /banked/i.test(t.text);
export function events(tweets) {
  const hits = tweets.map((t) => ({ ...t, kind: classify(t) })).filter((t) => t.kind).sort((a, b) => a.at.localeCompare(b.at));
  const groups = [];
  for (const t of hits) {
    // Each lab's resets cluster on their own.
    const g = [...groups].reverse().find((x) => x[0].company === t.company);
    // An announcement and its "propagated" follow-up belong to one reset.
    if (g && Date.parse(t.at) - Date.parse(g[g.length - 1].at) < 20 * 3600000 && !(g.some((x) => x.kind === "done") && isBanked(t) !== g.some(isBanked))) g.push(t);
    else groups.push([t]);
  }
  return groups.map((g) => {
    const trust = (t) => ACCOUNTS.find((a) => a.handle === t.handle)?.trust ?? (t.lab ? 3 : 0);
    const src = [...g].sort((a, b) => trust(b) - trust(a) || b.text.length - a.text.length)[0];
    const done = g.find((t) => t.kind === "done");
    return {
      id: `x-${g[0].id}`, company: g[0].company, product: PRODUCT[g[0].company] ?? g[0].company,
      date: (done ?? g[0]).at, announcedAt: g[0].at, status: done ? "done" : "coming",
      banked: g.some((t) => t.curated === "banked" || (t.company === "openai" ? /banked/i : BANKED).test(t.text)),
      title: headline(g), quote: tidy(src.text).slice(0, 220), url: src.url, by: src.handle, byName: src.name ?? src.handle,
      tweets: g.map((t) => ({ handle: t.handle, url: t.url, at: t.at })),
    };
  }).sort((a, b) => b.date.localeCompare(a.date));
}

