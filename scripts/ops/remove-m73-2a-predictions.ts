/**
 * Remove Match 73 "2A" predictions and ledger rows (same as remove-m73-2a-predictions.sql).
 *
 *   npm run ops:remove-m73-2a
 */
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { syncProfilePointsFromLedger } from "@/lib/scoring/sync-profile-points";

for (const name of [".env", ".env.local"] as const) {
  loadEnv({ path: resolve(process.cwd(), name), override: name === ".env.local" });
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  if (!url || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: m73Rows, error: mErr } = await supabase
    .from("matches")
    .select("id, external_key, match_number, home_team, away_team, winner")
    .or("match_number.eq.73,external_key.eq.WC26-M73,external_key.eq.wc2026:m73,external_key.eq.M73");

  if (mErr || !m73Rows?.length) {
    console.error(mErr?.message ?? "Match 73 not found");
    process.exit(1);
  }

  const matchIds = m73Rows.map((m) => m.id as string);
  console.log("Match 73 rows:", m73Rows);

  const { data: preds, error: pErr } = await supabase
    .from("predictions")
    .select("id, user_id, match_id, predicted_winner, profiles(display_name, email)")
    .in("match_id", matchIds)
    .eq("predicted_winner", "2A");

  if (pErr) {
    console.error(pErr.message);
    process.exit(1);
  }

  if (!preds?.length) {
    console.log("No 2A predictions on Match 73 — nothing to do.");
    return;
  }

  const userIds = [...new Set(preds.map((p) => p.user_id as string))];
  console.log(`Found ${preds.length} prediction(s) from ${userIds.length} user(s):`);
  for (const p of preds) {
    const prof = p.profiles as { display_name?: string; email?: string } | null;
    console.log(`  - ${prof?.display_name ?? "?"} (${prof?.email ?? "?"})`);
  }

  const { error: ledgerErr } = await supabase
    .from("points_ledger")
    .delete()
    .in("user_id", userIds)
    .in("source_id", matchIds)
    .in("source_type", ["match", "bonus"]);
  if (ledgerErr) {
    console.error("Ledger delete failed:", ledgerErr.message);
    process.exit(1);
  }

  const { error: bonusErr } = await supabase
    .from("prediction_bonus_answers")
    .delete()
    .in("user_id", userIds)
    .in("match_id", matchIds);
  if (bonusErr) {
    console.error("Bonus answers delete failed:", bonusErr.message);
    process.exit(1);
  }

  const { error: predErr } = await supabase
    .from("predictions")
    .delete()
    .in("user_id", userIds)
    .in("match_id", matchIds)
    .eq("predicted_winner", "2A");
  if (predErr) {
    console.error("Prediction delete failed:", predErr.message);
    process.exit(1);
  }

  const sync = await syncProfilePointsFromLedger(supabase);
  console.log(`Done. Profiles synced: ${sync.updated} updated, ${sync.unchanged} unchanged.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
