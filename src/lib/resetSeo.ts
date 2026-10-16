import { NOW, resetHistory } from "./data";
import { daysBetween, fmtDate } from "./format";

// Search snippets and quick answers for the reset pages, rebuilt every 30 minutes with the latest
// reset date, so Google shows the answer people search for ("codex reset today", "claude limit reset").

type Lab = "openai" | "anthropic";
const LAB: Record<Lab, { name: string; product: string; poster: string }> = {
  openai: { name: "Codex", product: "Codex and ChatGPT", poster: "OpenAI's Tibo (@thsottiaux) on X" },
  anthropic: { name: "Claude", product: "Claude", poster: "Anthropic on X" },
};

/** The latest finished reset for a lab, the median gap between recent ones and the next expected date. */
export function resetFacts(lab: Lab = "openai") {
  const all = resetHistory(lab);
  const done = all.filter((r) => r.status === "done");
  const coming = all.find((r) => r.status === "coming" && Date.parse(r.date) > NOW - 86400000 && (!done[0] || r.date > done[0].date));
  const last = done[0];
  const gaps = done.slice(0, 8).map((r, i, a) => (i ? daysBetween(r.date.slice(0, 10), a[i - 1].date.slice(0, 10)) : null)).filter((x): x is number => x != null && x > 0).sort((a, b) => a - b);
  // Only guess a next date when resets come often enough for a pattern (Codex, not Claude).
  const typicalGap = gaps.length >= 3 && gaps[Math.floor(gaps.length / 2)] <= 14 ? gaps[Math.floor(gaps.length / 2)] : null;
  const nextGuess = last && typicalGap ? new Date(Math.max(Date.parse(last.date) + typicalGap * 86400000, NOW)).toISOString().slice(0, 10) : null;
  const in30 = done.filter((r) => NOW - Date.parse(r.date) < 30 * 86400000).length;
  const in365 = done.filter((r) => NOW - Date.parse(r.date) < 365 * 86400000).length;
  return { last, coming, typicalGap, nextGuess, in30, in365 };
}

const today = () => new Date(NOW).toISOString().slice(0, 10);
const when = (iso: string) => (iso.slice(0, 10) === today() ? `today, ${fmtDate(iso, false)}` : fmtDate(iso));
export const resetToday = (lab: Lab = "openai") => resetFacts(lab).last?.date.slice(0, 10) === today();

export function resetSnippet(page: "codex" | "resets" | "claude") {
  const lab: Lab = page === "claude" ? "anthropic" : "openai";
  const { name, product } = LAB[lab];
  const { last, coming, typicalGap, nextGuess, in30 } = resetFacts(lab);
  const head = page === "codex" ? "Codex Reset Tracker" : page === "claude" ? "Claude Usage Limit Resets and Claude Code Tracker" : "Codex and ChatGPT Usage Resets";
  if (!last) return { title: `${head}: Every Usage Limit Reset`, description: `Every ${product} usage limit reset, straight from the lab on X, checked every 30 minutes.` };
  const title = page === "claude" ? head
    : resetToday(lab) ? `${head}: ${name} Reset Today, ${fmtDate(last.date, false)}`
    : coming ? `${head}: Next Reset ${fmtDate(coming.date, false)}, Last ${fmtDate(last.date, false)}`
    : `${head}: Last Reset ${fmtDate(last.date)}`;
  const parts = [
    `The last ${product} usage reset was ${when(last.date)}, posted by ${LAB[lab].poster}.`,
    coming ? `The next one is announced for ${fmtDate(coming.date)}.` : nextGuess && typicalGap ? `Resets have come about every ${typicalGap} days, so the next is likely around ${fmtDate(nextGuess, false)}.` : "",
    page === "resets" ? "Claude, Grok and Gemini resets too." : page === "claude" ? "Plus every Claude Code release and Claude news." : `${in30} resets in the last 30 days.`,
  ];
  return { title, description: parts.filter(Boolean).join(" ") };
}

/** The questions people actually type, answered with live dates (shown on the page and as FAQ markup). */
export function resetQA(lab: Lab = "openai"): [string, string][] {
  const { name, product, poster } = LAB[lab];
  const { last, coming, typicalGap, nextGuess, in30, in365 } = resetFacts(lab);
  if (!last) return [];
  const qa: [string, string][] = [
    [`When was the last ${name} reset?`, `The last ${product} usage limit reset was ${fmtDate(last.date)}, posted by ${poster}.`],
    [`When is the next ${name} reset?`, coming ? `${lab === "openai" ? "OpenAI" : "Anthropic"} has announced the next reset for ${fmtDate(coming.date)}.` : nextGuess && typicalGap ? `None is announced yet. Recent resets have come about every ${typicalGap} days, which points to around ${fmtDate(nextGuess)}. SI Rumors checks every 30 minutes.` : `None is announced yet. SI Rumors checks every 30 minutes and posts it here the moment one is.`],
    [`Did ${name} reset today?`, resetToday(lab) ? `Yes. ${product} usage limits reset today, ${fmtDate(last.date)}.` : `Not today. The last reset was ${fmtDate(last.date)}.`],
    [`How often does ${name} reset usage limits?`, lab === "openai" ? `There were ${in30} ${product} resets in the last 30 days${typicalGap ? `, typically ${typicalGap} days apart` : ""}.` : `Rarely. There ${in365 === 1 ? "was 1 everyone-at-once reset" : `were ${in365} everyone-at-once resets`} in the last 12 months.`],
  ];
  if (lab === "anthropic") qa.push(["Is this the same as my 5-hour or weekly limit resetting?", "No. Your own Claude limits refill on their own schedule, shown on the usage page in Claude's settings. This page tracks the extra resets Anthropic gives everyone at once."]);
  return qa;
}

export function resetFaq(lab: Lab = "openai") {
  const qa = resetQA(lab);
  if (!qa.length) return null;
  return { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: qa.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };
}

/** A search title for a reset's own page: "Codex Reset Oct 15, 2026: ChatGPT and Codex Usage Limits Reset". */
export function resetPageTitle(r: { company: string; product: string; date: string; status: string; banked: boolean }) {
  const name = r.company === "openai" ? "Codex" : r.product;
  const what = r.company === "openai" ? "ChatGPT and Codex" : r.product;
  return r.status === "coming"
    ? `${name} Reset Coming ${fmtDate(r.date)}: ${what} Usage Limits`
    : `${name} Reset ${fmtDate(r.date)}: ${what} Usage Limits ${r.banked ? "Banked Reset" : "Reset"}`;
}
