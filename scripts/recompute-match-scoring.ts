/**
 * Recompute match + per-match bonus points for all completed matches (service role).
 *
 *   npm run recompute:matches
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { recomputeAllCompletedMatchScoring } from "@/lib/scoring/recompute-all-match-scoring";

for (const name of [".env", ".env.local"] as const) {
  loadEnv({ path: resolve(process.cwd(), name), override: name === ".env.local" });
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

function makeServiceClient(): SupabaseClient {
  return createClient(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function main() {
  if (!url || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }
  const supabase = makeServiceClient();
  const result = await recomputeAllCompletedMatchScoring(supabase, 2026);
  if (!result.ok) {
    console.error(result.error);
    process.exit(1);
  }
  console.log(`Processed ${result.processed} completed matches.`);
  if (result.failures.length) {
    console.warn("Failures:");
    for (const f of result.failures) {
      console.warn(`  ${f.matchId}: ${f.error}`);
    }
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
