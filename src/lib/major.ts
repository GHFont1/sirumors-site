import type { Story } from "./data";

// What makes it onto SI Rumors. Only stories that matter: a lab's own launch or
// announcement, news carried by major outlets, rumors with real backing, and big
// government moves. Commentary ("X says", "breaks down", "why..."), customer case
// studies and marketing posts stay off the site.

/** Major outlets. A story needs these, not blogs, aggregators or Reddit, to count as verified. */
export const MAJOR_OUTLET = /^(reuters|bloomberg(\.com)?|wsj|the wall street journal|the new york times|financial times|the information|associated press|ap news|cnbc|the verge|techcrunch|ars technica|wired|axios|bbc|cnn|cnn business|the guardian|fortune|business insider|mit technology review|forbes|nbc news|abc news.*|the washington post|semafor|platformer|engadget|venturebeat|the economist|politico|cbs news|npr|electrek|9to5mac|9to5google|tom's hardware|the atlantic|time|los angeles times|yahoo finance|fox business|cnet|zdnet)$/i;

const NOISE = /\b(halves|cuts|slashes)\b.*\bcosts?\b|\b(cuts?|halves|saves?|turns?|helps?|powers?)\b.*\b(with|using|into)\b|\bhow .+ (uses?|built|turns?)\b|customer stor|case study|geforce now|gaming|gears of war|\bmyths?\b|webinar|\bevent recap\b|into the omniverse|^(how|why|what)\b|\bbrings?\b.*\binto\b|\bscal(es|ing)\b.*\bwith\b|\bhelping\b|rsvp|tech week|join us|livestream|founders,|\?$|safety demands|framework for|we want to/i;
const COMMENT = /\b(says?|saying|said|thinks?|believes?|describes?|breaks down|explains?|argues?|warns?|predicts?|reflects?|opinion|podcast|interview|op-ed|column|why|how|here'?s|i tried|hands-on|review|vs\.?|could|might|should|what we know|everything you need)\b|\?$/i;
const BIG = /\$\d[\d.,]* ?(million|billion|m|bn)\b|\b(invest\w*|backs|acquir\w*|acquisition|merger|buys?|ipo|raises?|funding|valuation|billion|lawsuit|sues?|sued|court|antitrust|executive order|ban(s|ned)?|launch(es|ed)?|releases?|unveils?|announces?|introduc\w+|layoffs?|resigns?|steps down|fired|ousted|deal|partnership|recall|investigation|probe|medals?|discloses?)\b/i;
const PRESS_NOISE = /net worth|richest|lose combined|\(photos?\)|smart people|stock (falls|rises|jumps|slides)|shares (fall|rise|jump|slide)/i;
const GOV = /\b(president|white house|executive order|congress|senate|supreme court|trump|federal|regulat\w+|eu ai act)\b/i;
const LAUNCH = /\b(is here|are live|is live|introducing|launch\w*|now available|available (now|today)|released?|announcing|out now|rolling out|rolls out|new model|today we|meet )\b/i;
const LAUNCH_X = /\b((is|are) (now )?here|(excited|proud|thrilled|happy) to (announce|launch|introduce|share|release)|is now live|are live|is live|(is|are) out|now live|(just|we) shipped|introducing|now available|available (now|today)|out now|rolling out|rolls out|(we('re| are)|today we('re| are)?) (launching|releasing|introducing|shipping)|meet )\b/i;
const PRODUCT = /\b(grok|gpt[- ]?\d|chatgpt|codex|sora|gemini|veo|claude|optimus|robotaxi|cybercab|fsd|copilot|comet|perplexity|openclaw|omarchy|hermes|api|app|model|agents?|features?|ai|v\d|\d+\.\d+)\b/i;
const COMMENT_X = /\b(i think|imo|lol|lmao|hot take|unpopular)\b|\?$/i;
const LABS = new Set(["openai", "anthropic", "google", "xai", "meta", "deepseek", "mistral", "tesla", "nvidia", "microsoft", "apple", "amazon", "waymo", "figure"]);

const outlets = (s: Story) => [...new Set([s.source, ...(s.cluster ?? []).map((c) => c.source)])];
/** How many distinct major outlets carried it. */
export const majorOutlets = (s: Story) => outlets(s).filter((o) => MAJOR_OUTLET.test(o.trim()));

export function isMajor(s: Story) {
  const t = (s.origTitle ?? s.title).replace(/[’‘]/g, "'");
  const m = majorOutlets(s).length;
  if (s.isReset) return false;
  if (s.type === "official") {
    if (NOISE.test(t)) return false;
    const lab = s.companies.some((c) => LABS.has(c));
    // A company's X post counts when it launches something: a lab, or a named model or version.
    if (/ on X$/.test(s.source)) {
      // Resets have their own page; a lab's (or its leaders') announcements count, other companies need a real launch.
      if (/\breset\b/i.test(t) || t.length < 25) return false;
      // A CEO's or founder's post: only a product or model announcement, never opinion or banter.
      if (s.person) return t.length >= 40 && LAUNCH_X.test(t) && PRODUCT.test(t) && !COMMENT_X.test(t);
      if (LABS.has(s.companies[0])) return LAUNCH_X.test(t) || /\b(announc\w*|launch\w*|releas\w*|shipped|improved|is live)\b/i.test(t);
      // Other companies' own accounts: a launch post about their product.
      return LAUNCH_X.test(t);
    }
    return lab || LAUNCH.test(t) || BIG.test(t);
  }
  if (s.isRumor) return m >= 1 || s.status === "strong" || s.status === "confirmed" || (s.status === "developing" && (s.sourceCount ?? 1) >= 3);
  if (s.type === "community") return m >= 2;
  if (PRESS_NOISE.test(t)) return false;
  if (COMMENT.test(t) && !BIG.test(t)) return m >= 3;
  if (GOV.test(t) && m >= 1 && (BIG.test(t) || (s.sourceCount ?? 1) >= 2)) return true;
  return m >= 2 || (m >= 1 && BIG.test(t));
}

/** What a list shows instead of an outlet name: who stands behind the story. */
export function credLabel(s: Story, folded: Story[] = []) {
  if (s.type === "official") return "Official";
  const m = new Set([s, ...folded].flatMap(majorOutlets)).size;
  if (m) return `Verified · ${m} major ${m === 1 ? "outlet" : "outlets"}`;
  return s.isRumor ? "Unconfirmed" : "Verified";
}
