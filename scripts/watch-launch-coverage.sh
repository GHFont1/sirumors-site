#!/bin/bash
# launchd runs a single instance of this job. Keep the latest result and the last recovery attempt across restarts.
set -eu
cd "$(dirname "$0")/.."
state_dir="$HOME/Library/Application Support/SI Rumors/launch-coverage"
mkdir -p "$state_dir"
report=$(mktemp "$state_dir/report.XXXXXX")
trap 'rm -f "$report"' EXIT
date -u '+%FT%TZ' > "$report"
status=0
node scripts/audit-launch-coverage.mjs >> "$report" 2>&1 || status=$?
mv "$report" "$state_dir/latest.txt"
if [ "$status" -eq 0 ]; then
  rm -f "$state_dir/failing-since" "$state_dir/notified"
  exit 0
fi
now=$(date +%s)
[ -f "$state_dir/failing-since" ] || echo "$now" > "$state_dir/failing-since"
last=$(cat "$state_dir/last-retry" 2>/dev/null || echo 0)
if [ "$status" -eq 2 ] && [ $((now-last)) -ge 1800 ]; then
  active=$(gh run list --workflow update.yml --limit 10 --json status --jq '[.[]|select(.status!="completed")]|length') || active=unknown
  if [ "$active" = 0 ] && gh workflow run update.yml; then echo "$now" > "$state_dir/last-retry"; fi
fi
if [ $((now-$(cat "$state_dir/failing-since"))) -ge 1800 ] && [ ! -f "$state_dir/notified" ]; then
  /usr/bin/osascript -e 'display notification "Official launch coverage needs attention. See the latest launch-coverage report." with title "SI Rumors"' && touch "$state_dir/notified"
fi
exit "$status"
