/**
 * Operator seed script — run locally with service role key only.
 *
 * Matches CSV:
 *   - Canonical: external_key, home_team, away_team, match_time_utc (ISO), status (optional), winner (optional)
 *   - Google Sheet / docs export: match_number, team_home, team_away, GMT Match Time (DD/MM/YYYY HH:mm:ss as UTC),
 *     match_status (COMPLETED / …), result_winner, result_bonus — tab or comma delimiter (auto-detected)
 *
 * Profiles: email, display_name, legacy_points (see scripts/README.md)
 *
 * Usage:
 *   npm run seed -- matches ./docs/matches.csv
 *   npm run seed -- matches ./matches.csv
 *   npm run seed -- profiles ./profiles.csv
 *   npm run seed -- aliases ./legacy-aliases.csv
 *   npm run seed:demo
 *   npm run seed:ipl2026
 *   npm run seed -- legacy-predictions ./docs/predictions_so_far.csv [season_label] [--display-name]
 *   npm run seed -- legacy-predictions-staging ./docs/predictions_so_far.csv [season_label]
 *
 * Legacy prediction CSVs: Google Form columns *or* scoring export (`name`, `match_number`, `pred_winner`,
 * `pred_bonus`, `timestamp`, etc.) — see legacy* helpers below.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { parse } from "csv-parse/sync";
import * as fs from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { applyMatchScoring } from "@/lib/scoring/match-scoring";

// tsx does not load .env.local (Next.js does); mirror Next precedence: .env then .env.local
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

function detectDelimiter(headerLine: string): string {
  const tabs = (headerLine.match(/\t/g) ?? []).length;
  const commas = (headerLine.match(/,/g) ?? []).length;
  return tabs > commas ? "\t" : ",";
}

function normalizeRowKeys(row: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    const key = k.trim();
    if (!key) continue;
    out[key] = typeof v === "string" ? v.trim() : String(v ?? "").trim();
  }
  return out;
}

function normalizePersonName(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Google Form + internal scoring sheet (`docs/prediction_scoring_so_far`–style). */
function legacyNameRaw(row: Record<string, string>): string {
  return (row["Name"] ?? row["Participant"] ?? row["name"] ?? row["player_key"] ?? "").trim();
}

function legacyMatchCell(row: Record<string, string>): string {
  return String(row["Select the match"] ?? row["match_number"] ?? "").trim();
}

function legacyWinnerCell(row: Record<string, string>): string {
  return (row["Winner Prediction"] ?? row["pred_winner"] ?? "").trim();
}

/** Parses Submitted at / timestamp; returns NaN if present but unparseable. */
function legacySubmittedAtMs(row: Record<string, string>): number {
  const raw = (row["Submitted at"] ?? row["timestamp"] ?? row["Timestamp"] ?? "").trim();
  if (!raw) return 0;
  const normalized = raw.includes("T") ? raw : raw.replace(/^(\d{4}-\d{2}-\d{2})\s+/, "$1T");
  const t = new Date(normalized.replace(" ", "T")).getTime();
  return Number.isNaN(t) ? NaN : t;
}

function legacyBonusPickFromRow(row: Record<string, string>): string {
  const tryKeys = [
    "Bonus Question Answer",
    "pred_bonus",
    "pred bonus",
    "bonus_pick",
  ];
  for (const k of tryKeys) {
    const v = (row[k] ?? "").trim();
    if (v) return v;
  }
  for (const [k, val] of Object.entries(row)) {
    const lk = k.trim().toLowerCase().replace(/\s+/g, "_");
    if (lk === "pred_bonus" || lk === "bonus_pick") {
      const v = String(val ?? "").trim();
      if (v) return v;
    }
  }
  const fromForm = Object.entries(row)
    .filter(([k]) => k.trim().startsWith("Bonus Question Answer"))
    .map(([, v]) => String(v ?? "").trim())
    .filter(Boolean);
  return fromForm[0] ?? "";
}

/** Parses `DD/MM/YYYY HH:mm:ss` as UTC wall time (matches IPL GMT column in docs/matches.csv). */
function parseGmtCellToIsoUtc(cell: string): string {
  const s = cell.trim();
  if (!s) throw new Error("empty");
  const isoTry = new Date(s);
  if (!Number.isNaN(isoTry.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(s)) {
    return isoTry.toISOString();
  }
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})/);
  if (!m) throw new Error(`unrecognized datetime: ${s}`);
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  const hh = Number(m[4]);
  const mi = Number(m[5]);
  const ss = Number(m[6]);
  return new Date(Date.UTC(y, mo - 1, d, hh, mi, ss)).toISOString();
}

/** Parses sheet local IST columns (`match_date` + `match_time`) into UTC ISO instant. */
function parseIstDateTimeToIsoUtc(dateCell: string, timeCell: string): string {
  const d = dateCell.trim();
  const t = timeCell.trim();
  const mDate = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const mTime = t.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  if (!mDate || !mTime) throw new Error(`bad IST date/time: "${dateCell}" "${timeCell}"`);
  const day = Number(mDate[1]);
  const month = Number(mDate[2]);
  const year = Number(mDate[3]);
  const hour = Number(mTime[1]);
  const minute = Number(mTime[2]);
  const second = Number(mTime[3] ?? "0");
  const istOffsetMs = (5 * 60 + 30) * 60 * 1000;
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second) - istOffsetMs).toISOString();
}

function mapRowToMatchPayload(r: Record<string, string>): {
  external_key: string;
  home_team: string;
  away_team: string;
  match_time_utc: string;
  status: string;
  winner: string | null;
  bonus_result: string | null;
} | null {
  const row = normalizeRowKeys(r);
  const external_key = (row.external_key ?? row.match_number ?? "").trim();
  const home_team = (row.home_team ?? row.team_home ?? "").trim();
  const away_team = (row.away_team ?? row.team_away ?? "").trim();
  if (!external_key || !home_team || !away_team) return null;

  let match_time_utc: string;
  try {
    const dateCell = (row.match_date ?? "").trim();
    const timeCell = (row.match_time ?? "").trim();
    if (dateCell && timeCell) {
      // Prefer explicit local fixture columns; this avoids accidental lock-time imports.
      match_time_utc = parseIstDateTimeToIsoUtc(dateCell, timeCell);
    } else {
      const gmtCell = (row["GMT Match Time"] ?? row.match_time_utc ?? "").trim();
      if (!gmtCell) return null;
      match_time_utc = parseGmtCellToIsoUtc(gmtCell);
    }
  } catch {
    console.warn(`Skip ${external_key}: bad match date/time payload`);
    return null;
  }

  const ms = (row.match_status ?? row.status ?? "").toUpperCase();
  const winnerRaw = (row.result_winner ?? row.winner ?? "").trim();
  const bonusRaw = (row.result_bonus ?? row.bonus_result ?? "").trim();

  let status = "scheduled";
  if (/ABANDON/i.test(winnerRaw) || /ABANDON/i.test(ms)) {
    status = "abandoned";
  } else if (/CANCEL/i.test(ms)) {
    status = "cancelled";
  } else if (/COMPLET/i.test(ms)) {
    status = "completed";
  }

  let winner: string | null = null;
  if (status === "completed" && winnerRaw && !/ABANDON/i.test(winnerRaw)) {
    winner = winnerRaw;
  }

  const bonus_result =
    status === "completed" && bonusRaw ? bonusRaw : null;

  return {
    external_key,
    home_team,
    away_team,
    match_time_utc,
    status,
    winner,
    bonus_result,
  };
}

async function seedMatchesWithClient(supabase: SupabaseClient, file: string) {
  const raw = fs.readFileSync(file, "utf8");
  const firstLine = raw.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
  const delimiter = detectDelimiter(firstLine);

  const rows = parse(raw, {
    columns: (headers: string[]) => headers.map((h) => String(h).trim()),
    delimiter,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  }) as Record<string, string>[];

  let ok = 0;
  let scored = 0;
  let scoreErrors = 0;
  for (const r of rows) {
    const payload = mapRowToMatchPayload(r);
    if (!payload) continue;

    const { error } = await supabase.from("matches").upsert(
      {
        ...payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "external_key" },
    );

    if (error) {
      console.error("Upsert error:", payload.external_key, error.message);
    } else {
      ok += 1;
      if (payload.status === "completed") {
        const { data: mRow } = await supabase
          .from("matches")
          .select("id")
          .eq("external_key", payload.external_key)
          .maybeSingle();
        if (mRow?.id) {
          const sc = await applyMatchScoring(supabase, mRow.id as string, 2026);
          if (!sc.ok) {
            console.warn(`Scoring failed for ${payload.external_key}:`, sc.error);
            scoreErrors += 1;
          } else {
            scored += 1;
          }
        }
      }
    }
  }

  console.log(
    `Matches: upserted ${ok} rows from ${file} (delimiter="${delimiter === "\t" ? "tab" : "comma"}").`,
  );
  if (scored > 0 || scoreErrors > 0) {
    console.log(`Match scoring: ${scored} ok, ${scoreErrors} failed.`);
  }
}

async function seedMatches(file: string) {
  await seedMatchesWithClient(makeServiceClient(), file);
}

async function seedProfiles(file: string) {
  const raw = fs.readFileSync(file, "utf8");
  const firstLine = raw.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
  const delimiter = detectDelimiter(firstLine);
  const rows = parse(raw, {
    columns: (headers: string[]) => headers.map((h) => String(h).trim()),
    delimiter,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  }) as Record<string, string>[];

  const supabase = makeServiceClient();

  let ok = 0;
  for (const r of rows) {
    const row = normalizeRowKeys(r);
    const email = (row.email ?? row.Email ?? "").trim().toLowerCase();
    const display_name = row.display_name ?? row.name ?? row.participant ?? "";
    const legacy = row.legacy_points ?? row.legacy ?? row.points;

    if (!email) {
      console.warn("Skip profile row (no email):", row);
      continue;
    }

    const legacy_points = legacy != null && legacy !== "" ? Number(legacy) : null;

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: display_name || undefined,
        legacy_points: legacy_points ?? undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("email", email);

    if (error) {
      console.error("Profile update error:", error.message, email);
    } else {
      ok += 1;
    }
  }

  console.log(`Profiles: attempted updates for ${ok} rows (only existing signed-up users).`);
}

async function seedAliasesWithClient(supabase: SupabaseClient, file: string) {
  const raw = fs.readFileSync(file, "utf8");
  const firstLine = raw.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
  const delimiter = detectDelimiter(firstLine);
  const rows = parse(raw, {
    columns: (headers: string[]) => headers.map((h) => String(h).trim()),
    delimiter,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  }) as Record<string, string>[];
  const payload = rows
    .map((r) => {
      const row = normalizeRowKeys(r);
      return {
        season_label: row.season_label ?? "2025",
        legacy_name: row.legacy_name ?? row.name ?? "",
        legacy_email: row.legacy_email ?? row.email ?? null,
      };
    })
    .filter((r) => r.legacy_name);
  const { error } = await supabase.from("legacy_aliases").upsert(payload, {
    onConflict: "season_label,legacy_name",
  });
  if (error) {
    console.error("Aliases import error:", error.message);
    process.exit(1);
  }
  console.log(`Aliases: upserted ${payload.length} rows.`);
}

async function seedAliases(file: string) {
  await seedAliasesWithClient(makeServiceClient(), file);
}

/**
 * Import legacy tally submissions: maps `Name` → `legacy_aliases` (claimed rows only) and
 * `Select the match` → `matches.external_key` (e.g. M1). Latest row per (user, match) wins.
 */
async function seedLegacyPredictions(
  supabase: SupabaseClient,
  file: string,
  seasonLabel: string,
  options?: { matchDisplayName?: boolean },
) {
  const raw = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  const firstLine = raw.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
  const delimiter = detectDelimiter(firstLine);
  const rows = parse(raw, {
    columns: (headers: string[]) => headers.map((h) => String(h).trim()),
    delimiter,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  }) as Record<string, string>[];

  const { data: matchesDb, error: mErr } = await supabase.from("matches").select("id, external_key");
  if (mErr || !matchesDb?.length) {
    console.error("Could not load matches:", mErr?.message ?? "empty");
    process.exit(1);
  }
  const extToId = new Map<string, string>();
  for (const m of matchesDb) {
    const k = (m.external_key as string)?.trim();
    if (k) extToId.set(k.toUpperCase(), m.id as string);
  }

  const { data: aliases, error: aErr } = await supabase
    .from("legacy_aliases")
    .select("legacy_name, claimed_by_user_id")
    .eq("season_label", seasonLabel)
    .not("claimed_by_user_id", "is", null);
  if (aErr) {
    console.error("legacy_aliases:", aErr.message);
    process.exit(1);
  }
  const nameToUser = new Map<string, string>();
  for (const a of aliases ?? []) {
    const n = normalizePersonName(a.legacy_name as string);
    if (!n) continue;
    nameToUser.set(n, a.claimed_by_user_id as string);
  }

  const displayNameToUser = new Map<string, string>();
  if (options?.matchDisplayName) {
    const { data: profs, error: pErr } = await supabase
      .from("profiles")
      .select("id, display_name");
    if (pErr) {
      console.error("profiles (display_name fallback):", pErr.message);
    } else {
      for (const p of profs ?? []) {
        const n = normalizePersonName(p.display_name as string);
        if (!n) continue;
        if (displayNameToUser.has(n)) {
          console.warn(`Duplicate display_name after normalize (last wins): "${n}"`);
        }
        displayNameToUser.set(n, p.id as string);
      }
      console.log(
        `Display-name fallback: ${displayNameToUser.size} normalized names from profiles (use with care if names collide).`,
      );
    }
  }

  function parseExternalFromCell(cell: string): string | null {
    const m = cell.trim().match(/\bM(\d+)\b/i);
    if (!m) return null;
    return `M${m[1]}`;
  }

  type Acc = { submitted: number; winner: string; bonus: string };
  const latest = new Map<string, Acc>();

  let skippedBlank = 0;
  let skippedNoName = 0;
  let skippedNoMatchKey = 0;
  let skippedNoUser = 0;
  let skippedNoMatch = 0;
  let skippedNoWinner = 0;
  let skippedBadTime = 0;

  for (const r of rows) {
    const row = normalizeRowKeys(r);
    const submissionId = (row["Submission ID"] ?? "").trim();
    const nameRaw = legacyNameRaw(row);
    const name = normalizePersonName(nameRaw);
    const matchCell = legacyMatchCell(row);
    const winner = legacyWinnerCell(row);
    // Sheet export often has hundreds of empty tab-rows at the bottom — do not count as "no name"
    if (!submissionId && !nameRaw && !matchCell && !winner) {
      skippedBlank += 1;
      continue;
    }
    if (!nameRaw) {
      skippedNoName += 1;
      continue;
    }
    if (!name) {
      skippedNoName += 1;
      continue;
    }
    const ext = parseExternalFromCell(matchCell);
    if (!ext) {
      skippedNoMatchKey += 1;
      continue;
    }
    if (!winner) {
      skippedNoWinner += 1;
      continue;
    }
    let userId = nameToUser.get(name);
    if (!userId && displayNameToUser.size > 0) {
      userId = displayNameToUser.get(name);
    }
    if (!userId) {
      skippedNoUser += 1;
      continue;
    }
    const matchId = extToId.get(ext.toUpperCase());
    if (!matchId) {
      skippedNoMatch += 1;
      continue;
    }
    const submittedMs = legacySubmittedAtMs(row);
    if (Number.isNaN(submittedMs)) {
      skippedBadTime += 1;
      continue;
    }
    const bonus = legacyBonusPickFromRow(row);
    const key = `${userId}:${matchId}`;
    const prev = latest.get(key);
    if (!prev || submittedMs >= prev.submitted) {
      latest.set(key, { submitted: submittedMs, winner, bonus });
    }
  }

  let ok = 0;
  let err = 0;
  for (const [key, v] of latest) {
    const [userId, matchId] = key.split(":");
    const { error } = await supabase.from("predictions").upsert(
      {
        user_id: userId,
        match_id: matchId,
        predicted_winner: v.winner,
        bonus_pick: v.bonus || null,
        updated_at: new Date(v.submitted).toISOString(),
      },
      { onConflict: "user_id,match_id" },
    );
    if (error) {
      console.error("Upsert", key, error.message);
      err += 1;
    } else {
      ok += 1;
    }
  }

  console.log(
    `Legacy predictions: upserted ${ok} rows, errors ${err}. Deduped keys: ${latest.size}. ` +
      `Skipped: blank_padding=${skippedBlank}, no_name=${skippedNoName}, no_M_in_match=${skippedNoMatchKey}, ` +
      `no_user_mapping=${skippedNoUser} (claim legacy_aliases for ${seasonLabel} and/or run with --display-name), ` +
      `unknown_match=${skippedNoMatch}, no_winner=${skippedNoWinner}, bad_time=${skippedBadTime}.`,
  );
}

async function seedLegacyPredictionsCli(
  file: string,
  seasonLabel: string,
  options?: { matchDisplayName?: boolean },
) {
  await seedLegacyPredictions(makeServiceClient(), file, seasonLabel, options);
}

/**
 * Load historical Form rows into legacy_prediction_staging (no auth user required).
 * When a user later claims the matching legacy_aliases row, picks are copied into predictions.
 */
async function seedLegacyPredictionsStaging(
  supabase: SupabaseClient,
  file: string,
  seasonLabel: string,
) {
  const raw = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  const firstLine = raw.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
  const delimiter = detectDelimiter(firstLine);
  const rows = parse(raw, {
    columns: (headers: string[]) => headers.map((h) => String(h).trim()),
    delimiter,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  }) as Record<string, string>[];

  const { data: matchesDb, error: mErr } = await supabase.from("matches").select("id, external_key");
  if (mErr || !matchesDb?.length) {
    console.error("Could not load matches:", mErr?.message ?? "empty");
    process.exit(1);
  }
  const extToId = new Map<string, string>();
  for (const m of matchesDb) {
    const k = (m.external_key as string)?.trim();
    if (k) extToId.set(k.toUpperCase(), m.id as string);
  }

  function parseExternalFromCell(cell: string): string | null {
    const m = cell.trim().match(/\bM(\d+)\b/i);
    if (!m) return null;
    return `M${m[1]}`;
  }

  type Acc = { submitted: number; winner: string; bonus: string };
  const latest = new Map<string, Acc>();

  let skippedBlank = 0;
  let skippedNoName = 0;
  let skippedNoMatchKey = 0;
  let skippedNoMatch = 0;
  let skippedNoWinner = 0;
  let skippedBadTime = 0;

  for (const r of rows) {
    const row = normalizeRowKeys(r);
    const submissionId = (row["Submission ID"] ?? "").trim();
    const nameRaw = legacyNameRaw(row);
    const name = normalizePersonName(nameRaw);
    const matchCell = legacyMatchCell(row);
    const winner = legacyWinnerCell(row);
    if (!submissionId && !nameRaw && !matchCell && !winner) {
      skippedBlank += 1;
      continue;
    }
    if (!nameRaw || !name) {
      skippedNoName += 1;
      continue;
    }
    const ext = parseExternalFromCell(matchCell);
    if (!ext) {
      skippedNoMatchKey += 1;
      continue;
    }
    if (!winner) {
      skippedNoWinner += 1;
      continue;
    }
    const matchId = extToId.get(ext.toUpperCase());
    if (!matchId) {
      skippedNoMatch += 1;
      continue;
    }
    const submittedMs = legacySubmittedAtMs(row);
    if (Number.isNaN(submittedMs)) {
      skippedBadTime += 1;
      continue;
    }
    const bonus = legacyBonusPickFromRow(row);
    const key = `${name}|${matchId}`;
    const prev = latest.get(key);
    if (!prev || submittedMs >= prev.submitted) {
      latest.set(key, { submitted: submittedMs, winner, bonus });
    }
  }

  let ok = 0;
  let err = 0;
  for (const [key, v] of latest) {
    const pipe = key.lastIndexOf("|");
    const nameKey = key.slice(0, pipe);
    const matchId = key.slice(pipe + 1);
    const { error } = await supabase.from("legacy_prediction_staging").upsert(
      {
        season_label: seasonLabel,
        legacy_name_key: nameKey,
        match_id: matchId,
        predicted_winner: v.winner,
        bonus_pick: v.bonus || null,
        source_submitted_at: new Date(v.submitted).toISOString(),
      },
      { onConflict: "season_label,legacy_name_key,match_id" },
    );
    if (error) {
      console.error("Staging upsert", key, error.message);
      err += 1;
    } else {
      ok += 1;
    }
  }

  console.log(
    `Legacy predictions → staging: upserted ${ok} rows, errors ${err}. Deduped keys: ${latest.size}. ` +
      `Skipped: blank_padding=${skippedBlank}, no_name=${skippedNoName}, no_M_in_match=${skippedNoMatchKey}, ` +
      `unknown_match=${skippedNoMatch}, no_winner=${skippedNoWinner}, bad_time=${skippedBadTime}. ` +
      `Claim alias in app to copy into predictions (requires DB migration 0010).`,
  );
}

async function seedLegacyPredictionsStagingCli(file: string, seasonLabel: string) {
  await seedLegacyPredictionsStaging(makeServiceClient(), file, seasonLabel);
}

async function seedMvp2Baseline(supabase: SupabaseClient) {
  const seasonYear = 2026;
  const now = new Date().toISOString();

  const { error: cfgErr } = await supabase.from("tournament_config").upsert(
    {
      season_year: seasonYear,
      answer_lock_utc: "2099-12-31T23:59:59Z",
      updated_at: now,
    },
    { onConflict: "season_year" },
  );
  if (cfgErr) {
    console.error("tournament_config upsert:", cfgErr.message);
    process.exit(1);
  }
  console.log("tournament_config: upserted season", seasonYear, "(lock far future for local testing).");

  const megaSlotPoints = [2, 2, 2, 2, 3, 3, 5, 3, 3];
  const { error: scoreErr } = await supabase.from("scoring_config").upsert(
    {
      season_year: seasonYear,
      match_winner_points: 2,
      match_bonus_points: 2,
      tournament_slot_points: megaSlotPoints,
      updated_at: now,
    },
    { onConflict: "season_year" },
  );
  if (scoreErr) {
    console.error("scoring_config upsert:", scoreErr.message);
    process.exit(1);
  }
  console.log("scoring_config: upserted Mega Bonus slot points (9 slots).");

  const slots = [
    { slot_no: 1, question_text: "Name one team that will finish in the Top 4." },
    { slot_no: 2, question_text: "Name a second team that will finish in the Top 4." },
    { slot_no: 3, question_text: "Name a third team that will finish in the Top 4." },
    { slot_no: 4, question_text: "Name a fourth team that will finish in the Top 4." },
    { slot_no: 5, question_text: "Name the first finalist" },
    { slot_no: 6, question_text: "Name the second finalist" },
    { slot_no: 7, question_text: "Name the IPL 2026 Winner" },
    { slot_no: 8, question_text: "Name the Orange Cap Winner of the Tournament" },
    { slot_no: 9, question_text: "Name the Purple Cap Winner of the Tournament" },
  ];
  for (const s of slots) {
    const { error } = await supabase.from("tournament_questions").upsert(
      {
        season_year: seasonYear,
        slot_no: s.slot_no,
        question_text: s.question_text,
        is_active: true,
        display_order: s.slot_no,
        updated_at: now,
      },
      { onConflict: "season_year,slot_no" },
    );
    if (error) {
      console.error("tournament_questions upsert:", error.message);
      process.exit(1);
    }
  }
  console.log("tournament_questions: upserted 9 Mega Bonus slots.");

  const { data: qrows, error: qErr } = await supabase
    .from("tournament_questions")
    .select("id, slot_no")
    .eq("season_year", seasonYear)
    .in(
      "slot_no",
      slots.map((s) => s.slot_no),
    );
  if (qErr || !qrows?.length) {
    console.error("tournament_questions load:", qErr?.message ?? "empty");
    process.exit(1);
  }

  const qidBySlot = new Map<number, string>(
    qrows.map((q) => [Number(q.slot_no), String(q.id)]),
  );

  const teamOptions = [
    "CSK",
    "DC",
    "GT",
    "KKR",
    "LSG",
    "MI",
    "PBKS",
    "RCB",
    "RR",
    "SRH",
  ];

  const orangeCapOptions = [
    "Shubhman Gill",
    "Virat Kohli",
    "Vaibhav Sooryavansi",
    "Rajat Patidar",
    "Shreyas Iyer",
    "Yashasvi Jaiswal",
    "Ishan Kishan",
    "Priyansh Arya",
    "Prabhsimran Singh",
    "None of the above",
  ];

  const purpleCapOptions = [
    "Anshul Kamboj",
    "Prince Yadav",
    "Prasidh Krishna",
    "Bhuveneshwar Kumar",
    "Joffra Archer",
    "krunal Pandya",
    "Kartik Tyagi",
    "Jamie Overton",
    "Ravi Bishnoi",
    "None of the above",
  ];

  const optionRows: {
    question_id: string;
    label: string;
    value: string;
    sort_order: number;
    updated_at: string;
  }[] = [];
  for (let slot = 1; slot <= 7; slot += 1) {
    const qid = qidBySlot.get(slot);
    if (!qid) continue;
    teamOptions.forEach((opt, i) => {
      optionRows.push({
        question_id: qid,
        label: opt,
        value: opt,
        sort_order: i,
        updated_at: now,
      });
    });
  }
  for (const [slot, opts] of [
    [8, orangeCapOptions],
    [9, purpleCapOptions],
  ] as const) {
    const qid = qidBySlot.get(slot);
    if (!qid) continue;
    opts.forEach((opt, i) => {
      optionRows.push({
        question_id: qid,
        label: opt,
        value: opt,
        sort_order: i,
        updated_at: now,
      });
    });
  }

  const qids = [...qidBySlot.values()];
  if (qids.length > 0) {
    const { error: delOptErr } = await supabase
      .from("tournament_question_options")
      .delete()
      .in("question_id", qids);
    if (delOptErr) {
      console.error("tournament_question_options delete:", delOptErr.message);
      process.exit(1);
    }
  }
  if (optionRows.length > 0) {
    const { error: insOptErr } = await supabase
      .from("tournament_question_options")
      .insert(optionRows);
    if (insOptErr) {
      console.error("tournament_question_options insert:", insOptErr.message);
      process.exit(1);
    }
  }
  console.log("tournament_question_options: upserted Mega Bonus options.");

  const { data: existingBonus } = await supabase
    .from("bonus_prompts")
    .select("id")
    .eq("season_year", seasonYear)
    .eq("prompt_key", "demo_tournament_total_sixes")
    .maybeSingle();

  if (!existingBonus) {
    const { error: bErr } = await supabase.from("bonus_prompts").insert({
      season_year: seasonYear,
      scope: "tournament",
      match_id: null,
      prompt_key: "demo_tournament_total_sixes",
      prompt_text: "Demo: predict total tournament sixes (number).",
      is_active: true,
      display_order: 0,
    });
    if (bErr) {
      console.error("bonus_prompts insert:", bErr.message);
      process.exit(1);
    }
    console.log("bonus_prompts: inserted one tournament-wide demo prompt.");
  } else {
    console.log("bonus_prompts: demo prompt already present, skip.");
  }
}

async function runDemoSeed() {
  const supabase = makeServiceClient();
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const samples = join(scriptDir, "samples");

  await seedMatchesWithClient(supabase, join(samples, "sample-matches.csv"));
  await seedMvp2Baseline(supabase);
  await seedAliasesWithClient(supabase, join(samples, "sample-aliases.csv"));

  console.log("\nDemo seed finished. Next: sign in once per test user, then run profiles CSV to attach legacy points/names.");
}

async function runIpl2026DocSeed() {
  const supabase = makeServiceClient();
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const docPath = join(root, "docs", "matches.csv");
  if (!fs.existsSync(docPath)) {
    console.error("Missing", docPath);
    process.exit(1);
  }
  await seedMatchesWithClient(supabase, docPath);
  await seedMvp2Baseline(supabase);
  console.log(
    "\nIPL 2026 sheet loaded from docs/matches.csv (completed + upcoming). Open /matches to verify; use /admin to set a real tournament lock when ready.",
  );
}

async function main() {
  const mode = process.argv[2];
  const file = process.argv[3];

  if (!url || !key) {
    console.error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (e.g. in .env.local) before seeding.",
    );
    process.exit(1);
  }

  if (mode === "demo") {
    await runDemoSeed();
    return;
  }

  if (mode === "ipl2026") {
    await runIpl2026DocSeed();
    return;
  }

  if (!mode || (!file && mode !== "demo" && mode !== "ipl2026")) {
    console.error(
      'Usage: npm run seed -- matches|profiles|aliases|legacy-predictions|legacy-predictions-staging <file> [season_label] [--display-name] | npm run seed:demo | npm run seed:ipl2026\nRequires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    );
    process.exit(1);
  }

  if (mode === "matches") {
    await seedMatches(file);
  } else if (mode === "profiles") {
    await seedProfiles(file);
  } else if (mode === "aliases") {
    await seedAliases(file);
  } else if (mode === "legacy-predictions") {
    const useDisplayName = process.argv.includes("--display-name");
    const seasonArg = process.argv[4];
    const seasonLabel =
      seasonArg && !seasonArg.startsWith("--") ? seasonArg : "2026";
    await seedLegacyPredictionsCli(file, seasonLabel, {
      matchDisplayName: useDisplayName,
    });
  } else if (mode === "legacy-predictions-staging") {
    const seasonArg = process.argv[4];
    const seasonLabel =
      seasonArg && !seasonArg.startsWith("--") ? seasonArg : "2026";
    await seedLegacyPredictionsStagingCli(file, seasonLabel);
  } else {
    console.error(
      'First arg must be "matches", "profiles", "aliases", "legacy-predictions", "legacy-predictions-staging", "demo", or "ipl2026" (or npm run seed:ipl2026).',
    );
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
