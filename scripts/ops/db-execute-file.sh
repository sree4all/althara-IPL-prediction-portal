#!/usr/bin/env bash
# Execute a SQL file against the linked Supabase project.
# Usage: npm run db:execute -- path/to/file.sql
set -euo pipefail

cd "$(dirname "$0")/../.."

if [[ $# -lt 1 ]]; then
  echo "Usage: npm run db:execute -- <sql-file>" >&2
  exit 1
fi

sql_file="$1"
if [[ ! -f "$sql_file" ]]; then
  echo "File not found: $sql_file" >&2
  exit 1
fi

if [[ ! -f supabase/.temp/project-ref ]]; then
  echo "Project not linked. Run: npm run db:link:ci" >&2
  exit 1
fi

export SUPABASE_ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN:-}"
if [[ -z "$SUPABASE_ACCESS_TOKEN" ]]; then
  echo "Set SUPABASE_ACCESS_TOKEN (Cursor Secrets)" >&2
  exit 1
fi

echo "Executing $sql_file on linked project..."
npx supabase db execute --file "$sql_file" --linked
echo "Done."
