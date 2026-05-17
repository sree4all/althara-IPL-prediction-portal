/**
 * Re-score one completed match by id or external_key.
 *
 *   npm run reapply:match -- M60
 *   npm run reapply:match -- a54b64c7-8812-4710-8a0f-7adae251a6fe
 */
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { applyMatchScoring } from "@/lib/scoring/match-scoring";

for (const name of [".env", ".env.local"] as const) {
  loadEnv({ path: resolve(process.cwd(), name), override: name === ".env.local" });
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const arg = process.argv[2];

async function main() {
  if (!url || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }
  if (!arg) {
    console.error("Usage: npm run reapply:match -- <external_key|MATCH_UUID>");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const isUuid = /^[0-9a-f-]{36}$/i.test(arg);
  const { data: match, error } = isUuid
    ? await supabase.from("matches").select("id, external_key").eq("id", arg).maybeSingle()
    : await supabase.from("matches").select("id, external_key").eq("external_key", arg).maybeSingle();

  if (error || !match) {
    console.error(error?.message ?? "Match not found");
    process.exit(1);
  }

  const result = await applyMatchScoring(supabase, match.id as string, 2026);
  if (!result.ok) {
    console.error(result.error);
    process.exit(1);
  }
  console.log(`Re-scored ${match.external_key ?? match.id}: ${result.ledgerRows} ledger row(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
