// node --test scripts/frontier.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { frontierList } from "./frontier.mjs";

const row = (model_name, rating, category = "overall") => ({ model_name, organization: "lab", license: "Proprietary", rating, vote_count: 1000, category });
// 25 filler models per board so the zero point (20th place) is realistic.
const filler = (hi, step, cat) => Array.from({ length: 25 }, (_, i) => row(`Filler ${i + 1}`, hi - step * (i + 1), cat));
const cache = () => ({
  text: [row("Worker (Max)", 1400), row("Chatter", 1560), row("Old Worker", 1300), ...filler(1550, 3, "overall"),
    row("Worker (Max)", 1400, "hard_prompts"), row("Chatter", 1560, "hard_prompts"), ...filler(1550, 3, "hard_prompts")],
  webdev: [row("Worker (xHigh)", 1822), row("Worker (High)", 1700), row("Old Worker", 1764), row("New Worker", 1759), row("Chatter", 1500), ...filler(1760, 6, "overall")],
  agent: [row("Worker (Max)", 27.4), row("Old Worker", 14.6), row("New Worker", 13.9), row("Chatter", 3), ...filler(14, 0.4, "overall")],
});

test("the model that leads coding and agents is #1, whatever its chat placing", () => {
  const list = frontierList(cache());
  assert.equal(list[0].model, "Worker");
  assert.equal(list[0].score, 100);
  assert.ok(list[0].boards.overall.pos > 20, "its low chat placing is still recorded for display");
});

test("a chat leader that is weak at coding and agents does not top the list", () => {
  const list = frontierList(cache());
  const chatter = list.find((m) => m.model === "Chatter");
  assert.equal(chatter.boards.overall.pos, 1);
  assert.ok(chatter.rank > 5 && chatter.score < 0);
});

test("a chat placing never changes the score, inside or outside any cutoff", () => {
  const a = frontierList(cache());
  const c = cache();
  c.text = c.text.map((r) => (r.model_name === "Old Worker" ? { ...r, rating: 1559 } : r));
  const b = frontierList(c);
  const s = (l) => l.find((m) => m.model === "Old Worker").score;
  assert.equal(s(a), s(b));
});

test("a near-tie in rating is a near-tie in score", () => {
  const list = frontierList(cache());
  const a = list.find((m) => m.model === "Old Worker"), b = list.find((m) => m.model === "New Worker");
  assert.ok(a.score > b.score && a.score - b.score < 4, `gap ${a.score - b.score}`);
});

test("variants collapse to the best one and a model must be on both scored boards", () => {
  const c = cache();
  c.agent = c.agent.filter((r) => r.model_name !== "Chatter");
  const list = frontierList(c);
  assert.equal(list.filter((m) => m.model === "Worker").length, 1);
  assert.equal(list.find((m) => m.model === "Worker").boards.coding.rating, 1822);
  assert.equal(list.find((m) => m.model === "Chatter"), undefined);
});
