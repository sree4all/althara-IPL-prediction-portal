import { NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/auth/require-admin";
import {
  DEFAULT_MAINTENANCE_BANNER_TEXT,
  fetchTournamentConfig2026,
  isMissingMaintenanceColumnsError,
  isMissingMegaBonusPublicColumnError,
} from "@/lib/data/tournament-config";

export async function GET() {
  const { supabase, denied } = await requireAdminOrResponse();
  if (denied) return denied;

  const { data: config, error: cfgErr } = await fetchTournamentConfig2026(supabase);
  if (cfgErr) {
    return NextResponse.json({ error: cfgErr.message }, { status: 500 });
  }

  const { data: questions } = await supabase
    .from("tournament_questions")
    .select("id, slot_no, question_text, is_active")
    .eq("season_year", 2026)
    .order("slot_no", { ascending: true });
  const { data: bonus_prompts } = await supabase
    .from("bonus_prompts")
    .select("id, scope, match_id, prompt_key, prompt_text, is_active, display_order")
    .eq("season_year", 2026)
    .order("display_order", { ascending: true });

  return NextResponse.json({
    season_year: 2026,
    answer_lock_utc: config?.answer_lock_utc ?? null,
    season_bonuses_visible_after_utc: config?.season_bonuses_visible_after_utc ?? null,
    season_bonuses_revealed_by_admin: config?.season_bonuses_revealed_by_admin ?? false,
    maintenance_mode: config?.maintenance_mode ?? false,
    maintenance_banner_text: config?.maintenance_banner_text ?? DEFAULT_MAINTENANCE_BANNER_TEXT,
    mega_bonus_all_answers_visible: config?.mega_bonus_all_answers_visible ?? false,
    questions: questions ?? [],
    bonus_prompts: bonus_prompts ?? [],
  });
}

export async function PATCH(request: Request) {
  const { supabase, denied } = await requireAdminOrResponse();
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as
    | {
        answer_lock_utc?: string | null;
        season_year?: number;
        season_bonuses_visible_after_utc?: string | null;
        season_bonuses_revealed_by_admin?: boolean;
        maintenance_mode?: boolean;
        maintenance_banner_text?: string;
        mega_bonus_all_answers_visible?: boolean;
      }
    | null;
  if (!body) return NextResponse.json({ error: "VALIDATION" }, { status: 400 });

  const season_year = body.season_year ?? 2026;
  const banner =
    body.maintenance_banner_text?.trim() || DEFAULT_MAINTENANCE_BANNER_TEXT;

  const fullPayload = {
    season_year,
    answer_lock_utc: body.answer_lock_utc ?? null,
    season_bonuses_visible_after_utc: body.season_bonuses_visible_after_utc ?? null,
    season_bonuses_revealed_by_admin: body.season_bonuses_revealed_by_admin ?? false,
    maintenance_mode: body.maintenance_mode ?? false,
    maintenance_banner_text: banner,
    mega_bonus_all_answers_visible: body.mega_bonus_all_answers_visible ?? false,
    updated_at: new Date().toISOString(),
  };

  const upsertOpts = { onConflict: "season_year" as const };

  let { error } = await supabase.from("tournament_config").upsert(fullPayload, upsertOpts);

  // If 0023 not applied, retry with maintenance columns preserved (banner + mode still save).
  if (error && isMissingMegaBonusPublicColumnError(error)) {
    const withoutMega = {
      season_year: fullPayload.season_year,
      answer_lock_utc: fullPayload.answer_lock_utc,
      season_bonuses_visible_after_utc: fullPayload.season_bonuses_visible_after_utc,
      season_bonuses_revealed_by_admin: fullPayload.season_bonuses_revealed_by_admin,
      maintenance_mode: fullPayload.maintenance_mode,
      maintenance_banner_text: fullPayload.maintenance_banner_text,
      updated_at: fullPayload.updated_at,
    };
    ({ error } = await supabase.from("tournament_config").upsert(withoutMega, upsertOpts));
  }

  // If 0022 not applied, retry without maintenance or mega columns.
  if (error && isMissingMaintenanceColumnsError(error)) {
    const withoutMaint = {
      season_year: fullPayload.season_year,
      answer_lock_utc: fullPayload.answer_lock_utc,
      season_bonuses_visible_after_utc: fullPayload.season_bonuses_visible_after_utc,
      season_bonuses_revealed_by_admin: fullPayload.season_bonuses_revealed_by_admin,
      mega_bonus_all_answers_visible: fullPayload.mega_bonus_all_answers_visible,
      updated_at: fullPayload.updated_at,
    };
    ({ error } = await supabase.from("tournament_config").upsert(withoutMaint, upsertOpts));
  }

  if (error && isMissingMegaBonusPublicColumnError(error)) {
    ({ error } = await supabase.from("tournament_config").upsert(
      {
        season_year: fullPayload.season_year,
        answer_lock_utc: fullPayload.answer_lock_utc,
        season_bonuses_visible_after_utc: fullPayload.season_bonuses_visible_after_utc,
        season_bonuses_revealed_by_admin: fullPayload.season_bonuses_revealed_by_admin,
        updated_at: fullPayload.updated_at,
      },
      upsertOpts,
    ));
  }

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        details: error.details,
        hint:
          error.message.includes("duplicate") || error.code === "23505"
            ? "Upsert must use onConflict=season_year (fixed in app). If you still see this, check tournament_config rows for the season."
            : "If this mentions maintenance columns, apply migration 0022_tournament_maintenance_mode.sql",
      },
      { status: 500 },
    );
  }
  return NextResponse.json({
    ok: true,
    message: "Tournament settings saved.",
  });
}
