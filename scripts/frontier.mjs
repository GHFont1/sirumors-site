// The frontier list: one ranked list of the best models, scored on the two Arena boards
// that measure finished work: coding (WebDev Arena) and agents (Agent Arena).
//
// On each board a model scores by rating, not by place: 100 at the leader's rating, 0 at
// the 20th model's rating, floored at -50. Near-ties therefore stay near-ties (two models
// 5 points apart no longer look a whole place apart). The frontier score is the average
// of the two, and a model must be on both.
//
// The chat boards (overall text, hard prompts) are blind votes on chat answers. They are
// recorded on every model for display, at whatever place the model holds, but they do not
// move the frontier score: averaging them in ranked the #1 coding and #1 agent model 17th,
// and ignoring them only past 40th place let a model 79th on chat outrank one 27th.

export const ORG = { google: "google", anthropic: "anthropic", openai: "openai", xai: "xai", meta: "meta", deepseek: "deepseek", mistral: "mistral", microsoft: "microsoft", nvidia: "nvidia", alibaba: "qwen", amazon: "amazon", apple: "apple", spacexai: "xai", moonshot: "moonshot", zai: "zai", "microsoft-ai": "microsoft", bfl: "bfl" };
export const ORG_NAME = { google: "Google", anthropic: "Anthropic", openai: "OpenAI", xai: "xAI", meta: "Meta", deepseek: "DeepSeek", mistral: "Mistral", alibaba: "Alibaba", xiaomi: "Xiaomi", moonshot: "Moonshot AI", zai: "Z.ai", tencent: "Tencent", baidu: "Baidu", amazon: "Amazon", microsoft: "Microsoft", nvidia: "NVIDIA", minimax: "MiniMax", bytedance: "ByteDance", stepfun: "StepFun" };

// One row per model: drop effort/size suffixes so "-high" and "-max" variants collapse.
export const base = (m) => m.toLowerCase().replace(/\s*\((high|max|low|medium|xhigh|thinking)\)/g, "").replace(/\s+/g, "-").replace(/[-_ ](high|max|low|medium|xhigh|thinking|reasoning|preview|exp|experimental|latest|\d{8}|\d{4}-\d{2}-\d{2})\b/g, "").replace(/[-_ ](high|max|low|medium|thinking)$/g, "");
export const pretty = (m) => base(m).split(/[-_]/).map((w) => (/^\d/.test(w) ? w : w === "gpt" ? "GPT" : w.length <= 2 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1))).join(" ")
  .replace(/(\d) (\d)/g, "$1.$2").replace(/^GPT (\d)/, "GPT-$1").replace(/\bGlm\b/, "GLM").replace(/\bMimo\b/, "MiMo").replace(/\bQwen(\d)/, "Qwen $1").replace(/\bOss\b/, "OSS");

/** Boards shown on every model: [id, dataset config, category]. */
export const SHOWN = [["overall", "text", "overall"], ["hard", "text", "hard_prompts"], ["coding", "webdev", "overall"], ["agent", "agent", "overall"]];
/** Boards that decide the frontier score. A model must be on all of them. */
export const SCORED = ["coding", "agent"];
const ZERO_AT = 20; // the model in this place on a board scores 0 there
const FLOOR = -0.5;

/** cache: { text: rows, webdev: rows, agent: rows }, each row { model_name, organization, license, rating, vote_count, category }. */
export function frontierList(cache) {
  const models = new Map();
  for (const [id, cfg, cat] of SHOWN) {
    if (!cache[cfg]) continue;
    const seen = new Set();
    const list = [];
    for (const r of cache[cfg].filter((r) => r.category === cat && Number.isFinite(r.rating)).sort((x, y) => y.rating - x.rating)) {
      const k = base(r.model_name).replace(/-search$/, "");
      if (seen.has(k)) continue;
      seen.add(k);
      list.push({ k, r });
    }
    if (!list.length) continue;
    const top = list[0].r.rating;
    const zero = list[Math.min(ZERO_AT, list.length) - 1].r.rating;
    list.forEach(({ k, r }, i) => {
      const org = String(r.organization ?? "").toLowerCase();
      const m = models.get(k) ?? { slug: k.replace(/\./g, "-"), model: pretty(r.model_name), org, orgName: ORG_NAME[org] ?? String(r.organization ?? ""), company: ORG[org] ?? null, open: !/proprietary/i.test(r.license ?? ""), boards: {} };
      m.boards[id] = { pos: i + 1, rating: cfg === "agent" ? Math.round(r.rating * 10) / 10 : Math.round(r.rating), votes: r.vote_count, norm: top > zero ? Math.max(FLOOR, (r.rating - zero) / (top - zero)) : 1 };
      models.set(k, m);
    });
  }
  return [...models.values()].filter((m) => SCORED.every((id) => m.boards[id]))
    .map((m) => ({ ...m, score: Math.round(1000 * SCORED.reduce((a, id) => a + m.boards[id].norm, 0) / SCORED.length) / 10 }))
    .sort((a, b) => b.score - a.score || a.boards.coding.pos + a.boards.agent.pos - (b.boards.coding.pos + b.boards.agent.pos))
    .map((m, i) => ({ ...m, rank: i + 1, boards: Object.fromEntries(Object.entries(m.boards).map(([k, v]) => [k, { pos: v.pos, rating: v.rating, votes: v.votes }])) }));
}
