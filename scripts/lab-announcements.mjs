import { createHash } from "node:crypto";
import { XMLParser } from "fast-xml-parser";

const sources = {
  OpenAI: "https://openai.com/news/rss.xml",
  Anthropic: "https://www.anthropic.com/news/models",
  "Google DeepMind": "https://deepmind.google/blog/rss.xml",
};
const clean = (s) => s.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").trim();

function listing(lab, body) {
  if (lab === "Anthropic") {
    return [...body.matchAll(/<li\b[^>]*data-listing-row[^>]*>([\s\S]*?)<\/li>/gi)].map(([, row]) => {
      const link = row.match(/<a\b[^>]*href="([^"]+)"[^>]*>(?:(?!<\/a>)[\s\S])*?<h3\b[^>]*>([\s\S]*?)<\/h3>/i);
      const date = row.match(/<time\b[^>]*>([^<]+)<\/time>/i)?.[1];
      if (!link || !date) throw new Error("Unrecognized Anthropic model listing row");
      return { url: new URL(link[1], sources[lab]).href, title: clean(link[2]), date: date + " UTC" };
    });
  }
  const items = new XMLParser().parse(body)?.rss?.channel?.item;
  if (!Array.isArray(items)) throw new Error("Expected an RSS item list");
  return items.map((i) => ({ url: i.link, title: i.title, date: i.pubDate, summary: typeof i.description === "string" ? i.description : "" }));
}

export function namedModels(title) {
  const text = title.replace(/[‑–]/g, "-");
  const names = new Set();
  const gpt = text.match(/\b(GPT-\d+(?:\.\d+)?) (\w+)(?: and (\w+))?$/i);
  if (gpt && /^introducing /i.test(text)) {
    names.add(`${gpt[1]} ${gpt[2]}`);
    if (gpt[3]) names.add(`${gpt[1]} ${gpt[3]}`);
  }
  for (const match of text.matchAll(/\bClaude [A-Z][a-z]+ \d+(?:\.\d+)?\b/g)) names.add(match[0]);
  const gemini = text.match(/^(?:Introducing )?(Gemini \d+(?:\.\d+)? [A-Z][a-z]+)(?:$| is now available$|: Our next frontier model$)/);
  if (gemini) names.add(gemini[1]);
  return [...names];
}

export async function collectAnnouncements() {
  const results = await Promise.all(Object.entries(sources).map(async ([lab, source]) => {
    try {
      const res = await fetch(source, { signal: AbortSignal.timeout(25000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rows = listing(lab, await res.text());
      if (!rows.length) throw new Error("Source returned no entries");
      const items = [];
      for (const row of rows) {
        const timestamp = Date.parse(row.date);
        if (!Number.isFinite(timestamp) || !row.title || !row.url) throw new Error("Missing announcement title, date or URL");
        if (timestamp > Date.now() || Date.now() - timestamp > 30 * 86400000) continue;
        // The lab model index is already curated. RSS also carries research, corporate and customer stories.
        if (lab !== "Anthropic" && !(/^introducing\b|\bis now available\b|our (?:new|next) frontier model/i.test(row.title))) continue;
        if (lab !== "Anthropic" && !/\d|\bmodel\b/i.test(row.title) && !/\b(?:our|new|frontier) (?:[\w-]+ ){0,2}model\b/i.test(row.summary ?? "")) continue;
        const u = new URL(row.url);
        if (u.protocol !== "https:") throw new Error("Unexpected announcement URL");
        const id = createHash("sha256").update(u.origin + u.pathname.replace(/\/$/, "")).digest("hex").slice(0, 20);
        items.push({ id, lab, models: namedModels(clean(row.title)), title: clean(row.title), date: new Date(timestamp).toISOString(), url: u.href });
      }
      return { lab, items };
    } catch (error) { return { lab, error: error.message }; }
  }));
  return results;
}
