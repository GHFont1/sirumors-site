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
