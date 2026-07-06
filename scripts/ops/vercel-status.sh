#!/usr/bin/env bash
# Show latest Vercel production deployment (requires VERCEL_TOKEN).
set -euo pipefail

cd "$(dirname "$0")/../.."

if [[ -z "${VERCEL_TOKEN:-}" ]]; then
  echo "VERCEL_TOKEN not set — skip or add in Cursor Secrets" >&2
  exit 1
fi

args=(ls --token "$VERCEL_TOKEN")
if [[ -n "${VERCEL_ORG_ID:-}" && -n "${VERCEL_PROJECT_ID:-}" ]]; then
  args+=(--scope "$VERCEL_ORG_ID")
fi

echo "Recent deployments:"
npx vercel "${args[@]}" 2>/dev/null | head -20 || npx vercel ls --token "$VERCEL_TOKEN" | head -20
