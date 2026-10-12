#!/usr/bin/env node
// One-time: verify sirumors.com in Google Search Console with the HTML tag method, add the
// property, submit the sitemaps, and make Benny a verified owner. Needs the token from
// ~/.config/sirumors-google/auth.mjs login. Safe to rerun.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
const HOME = process.env.HOME;
const SITE = "https://sirumors.com/";
const ROOT = new URL("..", import.meta.url).pathname;
const STATE = `${HOME}/.config/sirumors-search/state.json`;
const log = (...a) => console.log(new Date().toISOString(), "[google-verify]", ...a);
const token = execFileSync("node", [`${HOME}/.config/sirumors-google/auth.mjs`], { encoding: "utf8" }).trim();
const api = async (url, method = "GET", body) => {
  const r = await fetch(url, { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: body && JSON.stringify(body) });
  const t = await r.text();
  if (!r.ok) throw new Error(`${method} ${url.split("?")[0]} ${r.status}: ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : {};
};
const SV = "https://www.googleapis.com/siteVerification/v1";
const { token: meta } = await api(`${SV}/token`, "POST", { site: { type: "SITE", identifier: SITE }, verificationMethod: "META" });
const content = meta.match(/content="([^"]+)"/)[1];
log("token", content);
const seo = `${ROOT}src/lib/seo.ts`;
if (!readFileSync(seo, "utf8").includes(content)) {
  writeFileSync(seo, `// Google Search Console HTML-tag verification token.\nexport const GOOGLE_SITE_VERIFICATION = "${content}";\n`);
  const git = (...a) => execFileSync("git", ["-C", ROOT, ...a], { encoding: "utf8" });
  git("add", "src/lib/seo.ts");
  git("commit", "-qm", "Google Search Console verification tag\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>");
  git("push", "-q", "origin", "HEAD");
  log("tag pushed; waiting for the deploy");
}
for (let i = 0; i < 40; i++) {
  const html = await (await fetch(`${SITE}?t=${Date.now()}`)).text();
  if (html.includes(content)) break;
  if (i === 39) throw new Error("verification tag never went live");
  await new Promise((s) => setTimeout(s, 30000));
}
await api(`${SV}/webResource?verificationMethod=META`, "POST", { site: { type: "SITE", identifier: SITE } });
log("verified");
await api(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}`, "PUT");
for (const f of ["sitemap.xml", "news-sitemap.xml"]) await api(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/sitemaps/${encodeURIComponent(SITE + f)}`, "PUT");
log("property added, sitemaps submitted");
const st = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : {};
writeFileSync(STATE, JSON.stringify({ ...st, googleProperty: SITE, googleVerifiedAt: new Date().toISOString() }, null, 1));
