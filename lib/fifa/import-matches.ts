import { parse } from "csv-parse/sync";
import * as fs from "fs";
import * as path from "path";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_STAGE_SCORING,
  STAGE_SLUG_TO_KEY,
  stageIdToSlug,
} from "@/lib/fifa/stages";
import { parseKickoffCsvAsUtcIso } from "@/lib/utils/eastern-time";

type TeamRow = { id: string; team_name: string };
type CityRow = { id: string; venue_name: string };
type MatchRow = {
  match_number: string;
  home_team_id: string;
  away_team_id: string;
  city_id: string;
  kickoff_at: string;
  stage_id: string;
  match_label: string;
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

function resolveTeams(fifaDir: string): Map<number, string> {
  const rows = readCsv(path.join(fifaDir, "teams.csv")) as TeamRow[];
  const map = new Map<number, string>();
  for (const r of rows) {
    const id = Number(r.id);
    if (Number.isFinite(id)) map.set(id, r.team_name?.trim() ?? "");
  }
  return map;
}

function resolveVenues(fifaDir: string): Map<number, string> {
  const rows = readCsv(path.join(fifaDir, "host_cities.csv")) as CityRow[];
  const map = new Map<number, string>();
  for (const r of rows) {
    const id = Number(r.id);
    if (Number.isFinite(id)) map.set(id, r.venue_name?.trim() ?? "");
  }
  return map;
}

function teamName(
  teamId: string,
  matchLabel: string,
  side: "home" | "away",
  teams: Map<number, string>,
): string {
  const id = Number(teamId);
  if (Number.isFinite(id) && id > 0) {
    const name = teams.get(id);
    if (!name) throw new Error(`Unknown team_id ${id} in matches.csv`);
    return name;
  }
  const parts = matchLabel.split(/\s+vs\s+/i);
  if (parts.length === 2) {
    return side === "home" ? parts[0].trim() : parts[1].trim();
  }
  return side === "home" ? matchLabel.trim() || "TBD" : "TBD";
}

export type FifaImportResult = {
  upserted: number;
  errors: string[];
};

export async function importFifaMatches(
  supabase: SupabaseClient,
  fifaDir: string,
  seasonYear = 2026,
): Promise<FifaImportResult> {
  const teams = resolveTeams(fifaDir);
  const venues = resolveVenues(fifaDir);
  const rows = readCsv(path.join(fifaDir, "matches.csv")) as MatchRow[];
  const errors: string[] = [];
  let upserted = 0;
  const datasetVersion = new Date().toISOString();

  for (const row of rows) {
    const matchNumber = Number(row.match_number);
    if (!Number.isFinite(matchNumber)) {
      errors.push(`Invalid match_number: ${row.match_number}`);
      continue;
    }
    const stageId = Number(row.stage_id);
    const stageSlug = stageIdToSlug(stageId);
    if (!stageSlug) {
      errors.push(`Match ${matchNumber}: unknown stage_id ${row.stage_id}`);
      continue;
    }
    try {
      const homeId = Number(row.home_team_id);
      const awayId = Number(row.away_team_id);
      const home = teamName(row.home_team_id, row.match_label, "home", teams);
      const away = teamName(row.away_team_id, row.match_label, "away", teams);
      const cityId = Number(row.city_id);
      const venue = Number.isFinite(cityId) ? (venues.get(cityId) ?? "") : "";
      const external_key = `WC26-M${matchNumber}`;
      const kickoffRaw = row.kickoff_at.trim();
      const kickoffTz = kickoffRaw.match(/([+-]\d{2}(?::\d{2})?|Z)\s*$/i)?.[1] ?? null;

      const corePayload = {
        external_key,
        home_team: home,
        away_team: away,
        match_time_utc: parseKickoffCsvAsUtcIso(kickoffRaw),
        status: "scheduled",
        winner: null,
        bonus_result: null,
        tournament_stage: stageSlug,
        updated_at: new Date().toISOString(),
      };

      const extendedPayload = {
        ...corePayload,
        match_number: matchNumber,
        season_year: seasonYear,
        stage_key: STAGE_SLUG_TO_KEY[stageSlug],
        venue_label: venue ? ` — ${venue}` : null,
        home_team_display: home,
        away_team_display: away,
        external_team_home_id: Number.isFinite(homeId) && homeId > 0 ? homeId : null,
        external_team_away_id: Number.isFinite(awayId) && awayId > 0 ? awayId : null,
        dataset_version: datasetVersion,
        kickoff_tz_offset: kickoffTz,
      };

      let { error } = await supabase.from("matches").upsert(extendedPayload, {
        onConflict: "external_key",
      });
      if (error?.message?.includes("column")) {
        ({ error } = await supabase.from("matches").upsert(corePayload, {
          onConflict: "external_key",
        }));
      }
      if (error) {
        errors.push(`Match ${matchNumber}: ${error.message}`);
      } else {
        upserted++;
      }
    } catch (e) {
      errors.push(`Match ${matchNumber}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (errors.length > 0) {
    return { upserted, errors };
  }

  for (const row of DEFAULT_STAGE_SCORING) {
    await supabase.from("stage_scoring_config").upsert(
      {
        season_year: seasonYear,
        stage_slug: row.stage_slug,
        correct_points: row.correct_points,
        incorrect_points: row.incorrect_points,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "season_year,stage_slug" },
    );
  }

  return { upserted, errors };
}
