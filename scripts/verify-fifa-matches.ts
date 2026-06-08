/**
 * Compare docs/fifa CSVs against expected match rows (teams, UTC, stages).
 * Usage: npx tsx scripts/verify-fifa-matches.ts
 */

import { parse } from "csv-parse/sync";
import * as fs from "fs";
import * as path from "path";
import { stageIdToSlug, type TournamentStageSlug } from "@/lib/fifa/stages";
import { parseKickoffCsvAsUtcIso } from "@/lib/utils/eastern-time";

const fifaDir = path.resolve(process.cwd(), "docs/fifa");

const STAGE_KEY: Record<TournamentStageSlug, string> = {
  group: "group_stage",
  r32: "round_of_32",
  r16: "round_of_16",
  qf: "quarterfinals",
  sf: "semifinals",
  third_place: "third_place",
  final: "final",
};

function readCsv(filePath: string): Record<string, string>[] {
  const raw = fs.readFileSync(filePath, "utf8");
  const firstLine = raw.split(/\r?\n/)[0] ?? "";
  const delimiter =
    (firstLine.match(/\t/g) ?? []).length > (firstLine.match(/,/g) ?? []).length
      ? "\t"
      : ",";
  return parse(raw, { columns: true, skip_empty_lines: true, trim: true, delimiter });
}

type ExpectedRow = {
  match_number: number;
  external_key: string;
  home_team: string;
  away_team: string;
  match_time_utc: string;
  tournament_stage: TournamentStageSlug;
  stage_key: string;
  venue_label: string;
};

function buildExpected(): ExpectedRow[] {
  const teams = new Map(
    readCsv(path.join(fifaDir, "teams.csv")).map((r) => [
      Number(r.id),
      (r.team_name ?? "").trim(),
    ]),
  );
  const cities = new Map(
    readCsv(path.join(fifaDir, "host_cities.csv")).map((r) => [
      Number(r.city_id ?? r.id),
      (r.venue_name ?? "").trim(),
    ]),
  );
  const rows = readCsv(path.join(fifaDir, "matches.csv"));

  return rows.map((r) => {
    const matchNumber = Number(r.match_number);
    const homeId = Number(r.home_team_id);
    const awayId = Number(r.away_team_id);
    const stageSlug = stageIdToSlug(Number(r.stage_id));
    if (!stageSlug) throw new Error(`Match ${matchNumber}: bad stage_id ${r.stage_id}`);
    return {
      match_number: matchNumber,
      external_key: `wc2026:m${matchNumber}`,
      home_team: homeId > 0 ? (teams.get(homeId) ?? "TBD") : "TBD",
      away_team: awayId > 0 ? (teams.get(awayId) ?? "TBD") : "TBD",
      match_time_utc: parseKickoffCsvAsUtcIso(r.kickoff_at),
      tournament_stage: stageSlug,
      stage_key: STAGE_KEY[stageSlug],
      venue_label: ` — ${cities.get(Number(r.city_id)) ?? ""}`,
    };
  });
}

/** User paste snapshot — stage_key only for known wrong rows */
const USER_STAGE_SNAPSHOT: Record<number, string> = {
  97: "group_stage",
  98: "group_stage",
  99: "group_stage",
  100: "group_stage",
  101: "group_stage",
  102: "group_stage",
};

function main() {
  const expected = buildExpected();
  console.log(`Expected FIFA matches from CSV: ${expected.length}\n`);

  const stageFixes = expected.filter(
    (e) =>
      USER_STAGE_SNAPSHOT[e.match_number] &&
      USER_STAGE_SNAPSHOT[e.match_number] !== e.stage_key,
  );
  if (stageFixes.length) {
    console.log("Stage corrections needed (m97–m102 in your DB):");
    for (const e of stageFixes) {
      console.log(
        `  m${e.match_number}: ${USER_STAGE_SNAPSHOT[e.match_number]} → ${e.stage_key} (tournament_stage=${e.tournament_stage})`,
      );
    }
    console.log();
  }

  for (const n of [1, 4, 12, 97, 103, 104]) {
    const e = expected.find((x) => x.match_number === n);
    if (!e) continue;
    console.log(
      `m${n}: ${e.home_team} vs ${e.away_team} | ${e.match_time_utc} | ${e.tournament_stage} | ${e.venue_label.trim()}`,
    );
  }

  console.log("\nOther issues in your export:");
  console.log("  - 4 IPL demo rows (2026-DEMO1–4) should be deleted");
  console.log("  - If both WC26-M{n} and wc2026:m{n} exist, run scripts/ops/fix-fifa-match-data.sql");
  console.log("  - App reads tournament_stage (group/r32/…); your export shows stage_key only");
}

main();
