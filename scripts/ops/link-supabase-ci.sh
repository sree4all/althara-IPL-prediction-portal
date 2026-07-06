#!/usr/bin/env bash
# Non-interactive Supabase project link for Cloud Agents.
# Requires: SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF, SUPABASE_DB_PASSWORD
set -euo pipefail

cd "$(dirname "$0")/../.."

missing=()
for v in SUPABASE_ACCESS_TOKEN SUPABASE_PROJECT_REF SUPABASE_DB_PASSWORD; do
  if [[ -z "${!v:-}" ]]; then
    missing+=("$v")
  fi
done

if ((${#missing[@]})); then
  echo "Missing env: ${missing[*]}" >&2
  echo "Add them in Cursor Cloud Agents → Secrets. See docs/cloud-agent-setup.md" >&2
  exit 1
fi

export SUPABASE_ACCESS_TOKEN

if [[ -f supabase/.temp/project-ref ]]; then
  linked="$(tr -d '[:space:]' < supabase/.temp/project-ref)"
  if [[ "$linked" == "$SUPABASE_PROJECT_REF" ]]; then
    echo "Supabase already linked to $linked"
    exit 0
  fi
  echo "Re-linking from $linked to $SUPABASE_PROJECT_REF"
fi

npx supabase link --project-ref "$SUPABASE_PROJECT_REF" --password "$SUPABASE_DB_PASSWORD" --yes
echo "Linked to $SUPABASE_PROJECT_REF"
