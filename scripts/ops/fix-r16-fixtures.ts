/**
 * Apply Round of 16 fixture corrections (M89–M96) from docs/fifa/matches.csv.
 * Skips any fixture that already has at least one prediction (operator rule A).
 *
 *   npm run ops:fix-r16
 *   npm run ops:fix-r16 -- --dry-run
 */
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { importFifaMatches } from "@/lib/fifa/import-matches";
import { idsByFixtureNumber } from "@/lib/matches/dedupe-by-match-number";

const R16_FIRST = 89;
const R16_LAST = 96;

for (const name of [".env", ".env.local"] as const) {
  loadEnv({ path: resolve(process.cwd(), name), override: name === ".env.local" });
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dryRun = process.argv.includes("--dry-run");

async function main() {
  if (!url || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: matchRows, error: matchErr } = await supabase
    .from("matches")
    .select("id, external_key, match_number, home_team, away_team, match_time_utc")
    .gte("match_number", R16_FIRST)
    .lte("match_number", R16_LAST);

  if (matchErr) {
    console.error("Failed to load matches:", matchErr.message);
    process.exit(1);
  }

  const r16Rows = (matchRows ?? []).filter(
    (r) =>
      typeof r.match_number === "number" &&
      r.match_number >= R16_FIRST &&
      r.match_number <= R16_LAST,
  );

  if (!r16Rows.length) {
    console.error(`No matches with match_number ${R16_FIRST}–${R16_LAST} found.`);
    process.exit(1);
  }

  const aliasMap = idsByFixtureNumber(
    r16Rows.map((r) => ({
      id: r.id as string,
      external_key: r.external_key as string | null,
      match_number: r.match_number as number | null,
    })),
  );

  const allAliasIds = [...new Set(r16Rows.map((r) => r.id as string))];
  const { data: predictionRows, error: predErr } = await supabase
    .from("predictions")
    .select("match_id")
    .in("match_id", allAliasIds);

  if (predErr) {
    console.error("Failed to load predictions:", predErr.message);
    process.exit(1);
  }

  const predictedMatchIds = new Set((predictionRows ?? []).map((r) => r.match_id as string));
  const blockedFixtureNumbers = new Set<number>();

  for (const [fixtureNo, aliasIds] of aliasMap) {
    if (aliasIds.some((id) => predictedMatchIds.has(id))) {
      blockedFixtureNumbers.add(fixtureNo);
    }
  }

  if (blockedFixtureNumbers.size) {
    const blocked = [...blockedFixtureNumbers].sort((a, b) => a - b);
    console.log(
      `Skipping ${blocked.length} fixture(s) with existing predictions: M${blocked.join(", M")}`,
    );
    for (const n of blocked) {
      const row = r16Rows.find((r) => r.match_number === n);
      if (row) {
        console.log(
          `  M${n}: ${row.home_team} vs ${row.away_team} @ ${row.match_time_utc} (unchanged)`,
        );
      }
    }
  }

  if (dryRun) {
    const allowed = [...aliasMap.keys()]
      .filter((n) => !blockedFixtureNumbers.has(n))
      .sort((a, b) => a - b);
    console.log(`\n--dry-run: would update M${allowed.join(", M")} (${allowed.length} fixtures).`);
    return;
  }

  const fifaDir = resolve(process.cwd(), "docs/fifa");
  const onlyR16 = Array.from({ length: R16_LAST - R16_FIRST + 1 }, (_, i) => R16_FIRST + i);
  const result = await importFifaMatches(supabase, fifaDir, 2026, {
    onlyMatchNumbers: onlyR16,
    skipMatchNumbers: [...blockedFixtureNumbers],
  });

  if (result.errors.length) {
    console.error("Import errors:");
    for (const e of result.errors) console.error(`  ${e}`);
    process.exit(1);
  }

  const allowed = [...aliasMap.keys()]
    .filter((n) => !blockedFixtureNumbers.has(n))
    .sort((a, b) => a - b);

  if (!allowed.length) {
    console.log("No fixtures updated — all R16 matches have predictions.");
    return;
  }

  const { data: updated, error: verifyErr } = await supabase
    .from("matches")
    .select("match_number, external_key, home_team, away_team, match_time_utc")
    .in("match_number", allowed)
    .order("match_number", { ascending: true });

  if (verifyErr) {
    console.error("Verify failed:", verifyErr.message);
    process.exit(1);
  }

  console.log(`\nUpdated ${allowed.length} R16 fixture(s) from CSV (upserted ${result.upserted} total rows):`);
  for (const row of updated ?? []) {
    console.log(
      `  M${row.match_number}: ${row.home_team} vs ${row.away_team} @ ${row.match_time_utc}`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
