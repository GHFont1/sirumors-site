#!/bin/zsh
# launchd wrapper for reset-push.mjs (com.sirumors.reset-push, every minute): keys come from the Keychain.
export SUPABASE_SERVICE_ROLE_KEY="$(security find-generic-password -s com.sirumors.supabase-service -w)"
export VAPID_PRIVATE_KEY="$(security find-generic-password -s com.sirumors.vapid-private -w)"
exec /opt/homebrew/bin/node /Users/quantum/Projects/sirumors-site/scripts/reset-push.mjs --runner mac "$@"
