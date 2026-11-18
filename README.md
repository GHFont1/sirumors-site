# SI Rumors

The all-in-one tracker for the road to superintelligence: https://sirumors.com

Next.js 16 static export on GitHub Pages. A GitHub Actions job (`.github/workflows/update.yml`)
runs every 30 minutes: it ingests every source, saves the data to the `data` branch, rebuilds and
deploys. `watchdog.yml` checks the live `status.json` hourly, re-runs the update when data is
older than 2 hours, and keeps one open `incident` issue until a fresh live check passes.

## What it tracks

| Page | Route | Source |
|---|---|---|
| Home | `/` | Top stories (grouped across outlets), rumor board, trending, next releases, videos |
| Super tabs | `/c/<company>/`, `/t/<topic>/` | Companies and topics in `config/entities.json` |
| People | `/people/`, `/people/<slug>/` | Google News per person, YouTube interview search |
| Rumors | `/rumors/` | Rumor-language stories scored by independent outlets and track record |
| Releases | `/releases/` | Official announcements (first mention) + news launch coverage (3+ outlets) + `config/releases-seed.json` |
| Codex | `/codex/` | Limit-reset reports (news + HN), GitHub releases for Codex CLI, Claude Code, Gemini CLI |
| Videos | `/videos/` | Official lab channels, creators, people search (YouTube Data API) |
| Trends | `/trends/` | Daily mention history (`data/history.json`) |

## Run locally

```bash
npm install
YOUTUBE_API_KEY=... GITHUB_TOKEN=$(gh auth token) node scripts/ingest.mjs   # writes ./data
node scripts/ingest.mjs --backfill   # one-time: month-by-month release and reset history
npm run build && npx serve out
```

## Add things

- A company, topic or person: `config/entities.json` (keywords drive tagging). Add a logo with `npm run logos`.
- A source: `config/sources.json` (`feeds`, `newsQueries`, `youtube`, `githubRepos`, `blockSources`).
- A product line for release tracking: `config/releases-seed.json` (`detect.pattern` finds new versions).


## Measure reset search traffic

On the Mac with the site's Search Console access, run `node scripts/reset-search-report.mjs YYYY-MM-DD`. The read-only report compares the 28 days ending on that date with the preceding 28 days. It groups the three tracker pages separately from individual reset records. Both groups use page-level impressions, which can count multiple results from the same site in one search.

## Model launch coverage

Every update reads OpenAI News RSS, Anthropic’s own model index, and Google DeepMind RSS. The release page shows dated announcements independently of family/version matching. The models page can show a named announcement before Arena ranks it. A publisher outage preserves its previously collected entries.

The hourly GitHub watchdog and the Mac’s ten-minute launch-coverage job independently fetch those sources and compare them with the public homepage, release page and model list. Run `node scripts/audit-launch-coverage.mjs` to see gaps. Exit 1 signals a read failure and exit 2 signals missing coverage. The Mac requests a rebuild for a mismatch, at most once per half-hour. A gap or read failure persisting for half an hour triggers a local notification. The latest report is in `~/Library/Application Support/SI Rumors/launch-coverage/latest.txt`.
