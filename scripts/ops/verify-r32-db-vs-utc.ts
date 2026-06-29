/**
 * Compare DB R32 rows against UTC schedule (screenshot / r32-official-kickoffs).
 *   npx tsx scripts/ops/verify-r32-db-vs-utc.ts
 */
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { dedupeMatchesByFixtureNumber, fixtureNumber } from "@/lib/matches/dedupe-by-match-number";
import {
  R32_OFFICIAL_KICKOFFS,
  r32AwayNames,
  r32HomeNames,
} from "@/lib/fifa/r32-official-kickoffs";

for (const name of [".env", ".env.local"] as const) {
  loadEnv({ path: resolve(process.cwd(), name), override: name === ".env.local" });
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

function normTeam(s: string): string {
  return s.trim().toLowerCase();
}

function teamsMatch(
  dbHome: string,
  dbAway: string,
  expected: (typeof R32_OFFICIAL_KICKOFFS)[number],
): boolean {
  const h = normTeam(dbHome);
  const a = normTeam(dbAway);
  const homeOk = r32HomeNames(expected).some((n) => normTeam(n) === h);
  const awayOk = r32AwayNames(expected).some((n) => normTeam(n) === a);
  return homeOk && awayOk;
}

function utcLabel(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

async function main() {
  if (!url || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: rows, error } = await supabase
    .from("matches")
    .select(
      "id, match_number, external_key, home_team, away_team, match_time_utc, tournament_stage, venue_label",
    )
    .or(
      "and(match_number.gte.73,match_number.lte.88),tournament_stage.eq.r32",
    )
    .order("match_time_utc", { ascending: true });

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  const dbRows = (rows ?? []).filter(
    (r) =>
      (typeof r.match_number === "number" && r.match_number >= 73 && r.match_number <= 88) ||
      r.tournament_stage === "r32",
  );

  console.log(`DB rows (R32): ${dbRows.length}\n`);
  console.log(
    "Status | Expected (UTC) | DB kickoff (UTC) | DB fixture | match_number | external_key",
  );
  console.log("-".repeat(100));

  let ok = 0;
  let missing = 0;
  let mismatch = 0;

  for (const expected of R32_OFFICIAL_KICKOFFS) {
    const label = `${expected.home} vs ${expected.away}`;
    const expUtc = expected.match_time_utc;
    const match = dbRows.find((r) =>
      teamsMatch(r.home_team as string, r.away_team as string, expected),
    );

    if (!match) {
      missing++;
      console.log(`MISSING | ${utcLabel(expUtc)} | — | ${label} | — | —`);
      continue;
    }

    const dbUtc = new Date(match.match_time_utc as string).toISOString();
    const timeOk = dbUtc === expUtc;
    const status = timeOk ? "OK" : "TIME WRONG";
    if (timeOk) ok++;
    else mismatch++;

    console.log(
      `${status} | ${utcLabel(expUtc)} | ${utcLabel(dbUtc)} | ${match.home_team} vs ${match.away_team} | M${match.match_number ?? "?"} | ${match.external_key ?? "—"}`,
    );
  }

  const extra = dbRows.filter(
    (r) =>
      !R32_OFFICIAL_KICKOFFS.some((e) =>
        teamsMatch(r.home_team as string, r.away_team as string, e),
      ),
  );

  if (extra.length) {
    console.log("\nExtra DB rows not in UTC schedule:");
    for (const r of extra) {
      console.log(
        `  M${r.match_number ?? "?"} ${r.home_team} vs ${r.away_team} @ ${utcLabel(r.match_time_utc as string)}`,
      );
    }
  }

  console.log("\n--- All DB rows (32 duplicates?) ---");
  for (const r of dbRows) {
    console.log(
      `  ${(r.external_key as string)?.padEnd(12)} | mn=${String(r.match_number ?? "null").padEnd(4)} | ${utcLabel(r.match_time_utc as string)} | ${r.home_team} vs ${r.away_team}`,
    );
  }

  console.log(`\nSummary: ${ok} OK, ${mismatch} time mismatch, ${missing} missing, ${extra.length} extra`);

  const canonical = dedupeMatchesByFixtureNumber(dbRows)
    .filter((r) => {
      const n = fixtureNumber(r);
      return n != null && n >= 73 && n <= 88;
    })
    .sort((a, b) => (fixtureNumber(a) ?? 0) - (fixtureNumber(b) ?? 0));

  console.log("\n--- App-visible rows (WC26-M* after dedupe) vs screenshot UTC ---");
  let canonOk = 0;
  for (const expected of R32_OFFICIAL_KICKOFFS) {
    const row = canonical.find((r) =>
      teamsMatch(r.home_team as string, r.away_team as string, expected),
    );
    if (!row) {
      console.log(`MISSING in app | ${expected.home} vs ${expected.away}`);
      continue;
    }
    const dbUtc = new Date(row.match_time_utc as string).toISOString();
    const status = dbUtc === expected.match_time_utc ? "OK" : "TIME WRONG";
    if (status === "OK") canonOk++;
    console.log(
      `${status} | ${row.external_key} | ${row.home_team} vs ${row.away_team} | ${utcLabel(dbUtc)}`,
    );
  }
  console.log(`\nApp-visible: ${canonOk}/${R32_OFFICIAL_KICKOFFS.length} match screenshot UTC`);

  process.exit(missing + mismatch > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
