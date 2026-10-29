#!/bin/bash
# GitHub drops most of update.yml's scheduled runs (every 30 min asked, every 3-6 hours delivered), so
# the Mac dispatches it every 30 minutes. Skips when a run is already queued or in progress.
export PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin
REPO=GHFont1/sirumors-site
busy=$(gh run list -R "$REPO" -w update.yml -L 5 --json status --jq '[.[]|select(.status!="completed")]|length' 2>&1) || { echo "$(date '+%F %T') gh error: $busy"; exit 1; }
if [ "$busy" != "0" ]; then echo "$(date '+%F %T') update already running"; exit 0; fi
gh workflow run update.yml -R "$REPO" && echo "$(date '+%F %T') dispatched update"
