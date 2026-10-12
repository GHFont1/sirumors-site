// Headline similarity, shared by the story de-duplication and the update feed.

const STOP = new Set("the and for with from that this into over amid after about says said will have has are was its their than more most what when where which while your reportedly report reports new ai how why who".split(" "));
const COMMON = new Set(["ai", "the", "a", "an", "how", "why", "what", "is", "new", "massive", "leak", "report", "exclusive", "breaking"]);
// Crude stems (first 5 letters) so "catastrophe" and "catastrophic" match.
const words = (t: string) => new Set(t.toLowerCase().replace(/[^a-z0-9.\s]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)).map((w) => w.slice(0, 5)));
const names = (t: string) => new Set((t.match(/\b[A-Z][A-Za-z0-9.]+\b/g) ?? []).map((w) => w.toLowerCase()).filter((w) => !COMMON.has(w)));
export type Sig = { w: Set<string>; n: Set<string> };
export const sig = (t: string): Sig => ({ w: words(t), n: names(t) });
const shared = (a: Set<string>, b: Set<string>) => { let n = 0; for (const x of a) if (b.has(x)) n++; return n; };
export function similar(a: Sig, b: Sig) {
  const n = shared(a.w, b.w);
  if (n >= 3 && n / Math.max(1, Math.min(a.w.size, b.w.size)) >= 0.4) return true;
  // Same named entities (Gemini + Carbon, Nadella + trust) plus one more shared word.
  const pn = shared(a.n, b.n);
  return pn >= 2 && n >= pn + 1;
}

