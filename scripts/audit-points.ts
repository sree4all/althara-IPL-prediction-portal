/**
 * Compare profiles.current_points vs SUM(points_ledger).
 *
 *   npm run audit:points
 */
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { loadLedgerTotalsByUser } from "@/lib/scoring/ledger-totals";

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

  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("id, display_name, current_points");
  if (pErr) {
    console.error(pErr.message);
    process.exit(1);
  }

  const { count: ledgerRowCount } = await supabase
    .from("points_ledger")
    .select("id", { count: "exact", head: true });

  const sumByUser = await loadLedgerTotalsByUser(supabase);

  let driftCount = 0;
  const drifts: { name: string; current: number; expected: number; diff: number }[] = [];

  for (const p of profiles ?? []) {
    const ledgerSum = sumByUser.get(p.id as string) ?? 0;
    const expected = ledgerSum;
    const current = Number(p.current_points ?? 0);
    const diff = current - expected;
    if (diff !== 0) {
      driftCount += 1;
      drifts.push({
        name: (p.display_name as string) || (p.id as string),
        current,
        expected,
        diff,
      });
    }
  }

  drifts.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  console.log(`Profiles: ${profiles?.length ?? 0}`);
  console.log(`Ledger rows: ${ledgerRowCount ?? 0}`);
  console.log(`Profiles with drift (current != ledger sum): ${driftCount}`);
  console.log("\nTop 15 drifts:");
  for (const d of drifts.slice(0, 15)) {
    console.log(
      `  ${d.name}: current=${d.current} expected=${d.expected} diff=${d.diff > 0 ? "+" : ""}${d.diff}`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
