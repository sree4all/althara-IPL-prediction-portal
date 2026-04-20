import { NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/auth/require-admin";

export async function GET() {
  const { supabase, denied } = await requireAdminOrResponse();
  if (denied) return denied;

  const { data: config } = await supabase
    .from("tournament_config")
    .select(
      "id, season_year, answer_lock_utc, season_bonuses_visible_after_utc, season_bonuses_revealed_by_admin",
    )
    .eq("season_year", 2026)
    .maybeSingle();
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
    season_bonuses_revealed_by_admin: Boolean(config?.season_bonuses_revealed_by_admin),
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
      }
    | null;
  if (!body) return NextResponse.json({ error: "VALIDATION" }, { status: 400 });

  const season_year = body.season_year ?? 2026;
  const { error } = await supabase.from("tournament_config").upsert({
    season_year,
    answer_lock_utc: body.answer_lock_utc ?? null,
    season_bonuses_visible_after_utc: body.season_bonuses_visible_after_utc ?? null,
    season_bonuses_revealed_by_admin: body.season_bonuses_revealed_by_admin ?? false,
    updated_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

