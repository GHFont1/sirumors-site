import { NOW, resetHistory } from "./data";
import { daysBetween, fmtDate } from "./format";

// Search snippets for the reset pages, rebuilt every 30 minutes with the latest reset date,
// so Google shows the answer people are searching for ("codex reset today", "last codex reset").

/** The latest finished OpenAI reset, the median gap between recent ones and the next expected date. */
export function codexResetFacts() {
  const done = resetHistory("openai").filter((r) => r.status === "done");
  const coming = resetHistory("openai").find((r) => r.status === "coming" && Date.parse(r.date) > NOW - 86400000);
  const last = done[0];
  const gaps = done.slice(0, 8).map((r, i, a) => (i ? daysBetween(r.date.slice(0, 10), a[i - 1].date.slice(0, 10)) : null)).filter((x): x is number => x != null && x > 0).sort((a, b) => a - b);
  const typicalGap = gaps.length ? gaps[Math.floor(gaps.length / 2)] : null;
  const nextGuess = last && typicalGap ? new Date(Date.parse(last.date) + typicalGap * 86400000).toISOString().slice(0, 10) : null;
  const in30 = done.filter((r) => NOW - Date.parse(r.date) < 30 * 86400000).length;
  return { last, coming, typicalGap, nextGuess, in30 };
}

const today = () => new Date(NOW).toISOString().slice(0, 10);
const when = (iso: string) => (iso.slice(0, 10) === today() ? `today, ${fmtDate(iso, false)}` : fmtDate(iso));

export function codexResetSnippet(page: "codex" | "resets") {
  const { last, coming, typicalGap, nextGuess, in30 } = codexResetFacts();
  const head = page === "codex" ? "Codex Reset Tracker" : "Codex and ChatGPT Usage Resets";
  if (!last) return { title: `${head}: Every Usage Limit Reset`, description: "Every Codex and ChatGPT usage limit reset, straight from OpenAI staff on X, checked every 30 minutes." };
  const title = coming ? `${head}: Next Reset ${fmtDate(coming.date, false)}, Last ${fmtDate(last.date, false)}` : `${head}: Last Reset ${fmtDate(last.date)}`;
  const parts = [
    `The last Codex and ChatGPT usage reset was ${when(last.date)}, posted by OpenAI's Tibo on X.`,
    coming ? `The next one is announced for ${fmtDate(coming.date)}.` : nextGuess && typicalGap ? `Resets have come about every ${typicalGap} days, so the next is likely around ${fmtDate(nextGuess, false)}.` : "",
    page === "resets" ? "Claude, Grok and Gemini resets too." : `${in30} resets in the last 30 days.`,
  ];
  return { title, description: parts.filter(Boolean).join(" ") };
}

/** The questions people actually type, answered with live dates (shown on the page and as FAQ markup). */
export function codexResetQA(): [string, string][] {
  const { last, coming, typicalGap, nextGuess, in30 } = codexResetFacts();
  if (!last) return [];
  return [
    ["When was the last Codex reset?", `The last Codex and ChatGPT usage limit reset was ${fmtDate(last.date)}, posted by OpenAI's Tibo (@thsottiaux) on X.`],
    ["When is the next Codex reset?", coming ? `OpenAI has announced the next reset for ${fmtDate(coming.date)}.` : nextGuess && typicalGap ? `OpenAI has not announced one yet. Recent resets have come about every ${typicalGap} days, which points to around ${fmtDate(nextGuess)}. SI Rumors checks every 30 minutes.` : "OpenAI has not announced one yet. SI Rumors checks every 30 minutes."],
    ["Did Codex reset today?", last.date.slice(0, 10) === today() ? `Yes. Codex and ChatGPT usage limits reset today, ${fmtDate(last.date)}.` : `Not yet today. The last reset was ${fmtDate(last.date)}.`],
    ["How often does Codex reset usage limits?", `There were ${in30} Codex and ChatGPT resets in the last 30 days${typicalGap ? `, typically ${typicalGap} days apart` : ""}.`],
  ];
}

export function codexResetFaq() {
  const qa = codexResetQA();
  if (!qa.length) return null;
  return { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: qa.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };
}
