/**
 * Rebuild profiles.current_points = SUM(points_ledger).
 * Use after a bad recompute or manual ledger edits.
 *
 *   npm run sync:points
 *   npm run sync:points -- --dry-run
 */
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { loadLedgerTotalsByUser } from "@/lib/scoring/ledger-totals";
import { syncProfilePointsFromLedger } from "@/lib/scoring/sync-profile-points";

for (const name of [".env", ".env.local"] as const) {
  loadEnv({ path: resolve(process.cwd(), name), override: name === ".env.local" });
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dryRun = process.argv.includes("--dry-run");

async function main() {
  if (!url || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (dryRun) {
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id, display_name, current_points");
    if (pErr) {
      console.error(pErr.message);
      process.exit(1);
    }

    const sumByUser = await loadLedgerTotalsByUser(supabase);

    let drift = 0;
    for (const p of profiles ?? []) {
      const uid = p.id as string;
      const expected = sumByUser.get(uid) ?? 0;
      const current = Number(p.current_points ?? 0);
      if (current !== expected) {
        drift += 1;
        console.log(
          `${(p.display_name as string) ?? uid}: current=${current} expected=${expected}`,
        );
      }
    }
    console.log(`\nProfiles with drift: ${drift}`);
    return;
  }

  const result = await syncProfilePointsFromLedger(supabase);
  console.log(`Updated ${result.updated} profile(s); ${result.unchanged} already correct.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
