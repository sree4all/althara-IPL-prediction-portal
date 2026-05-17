/**
 * Rebuild profiles.current_points = COALESCE(legacy_points,0) + SUM(points_ledger).
 * Use after a bad recompute or manual ledger edits.
 *
 *   npm run sync:points
 *   npm run sync:points -- --dry-run
 */
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { resolve } from "path";

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

  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("id, legacy_points, current_points");
  if (pErr) {
    console.error(pErr.message);
    process.exit(1);
  }

  const { data: ledger, error: lErr } = await supabase
    .from("points_ledger")
    .select("user_id, points_delta");
  if (lErr) {
    console.error(lErr.message);
    process.exit(1);
  }

  const sumByUser = new Map<string, number>();
  for (const row of ledger ?? []) {
    const uid = row.user_id as string;
    sumByUser.set(uid, (sumByUser.get(uid) ?? 0) + Number(row.points_delta ?? 0));
  }

  const now = new Date().toISOString();
  let updated = 0;
  let unchanged = 0;

  for (const p of profiles ?? []) {
    const uid = p.id as string;
    const legacy = Number(p.legacy_points ?? 0);
    const ledgerSum = sumByUser.get(uid) ?? 0;
    const expected = legacy + ledgerSum;
    const current = Number(p.current_points ?? 0);
    if (current === expected) {
      unchanged += 1;
      continue;
    }
    if (dryRun) {
      console.log(`[dry-run] ${uid}: ${current} -> ${expected}`);
      updated += 1;
      continue;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ current_points: expected, updated_at: now })
      .eq("id", uid);
    if (error) {
      console.error(`Update failed for ${uid}:`, error.message);
      process.exit(1);
    }
    updated += 1;
  }

  console.log(
    dryRun
      ? `Dry run: would update ${updated} profiles (${unchanged} already correct).`
      : `Updated ${updated} profiles (${unchanged} already correct).`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
