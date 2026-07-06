#!/usr/bin/env bash
# Manual production deploy via Vercel CLI (fallback when Git auto-deploy is unavailable).
set -euo pipefail

cd "$(dirname "$0")/../.."

if [[ -z "${VERCEL_TOKEN:-}" ]]; then
  echo "Set VERCEL_TOKEN in Cursor Secrets" >&2
  exit 1
fi

args=(deploy --prod --yes --token "$VERCEL_TOKEN")
if [[ -n "${VERCEL_ORG_ID:-}" ]]; then
  args+=(--scope "$VERCEL_ORG_ID")
fi

echo "Deploying to Vercel production..."
npx vercel "${args[@]}"
