import { NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/auth/require-admin";
import { STAGE_LABEL, STAGE_ORDER, type TournamentStageSlug } from "@/lib/fifa/stages";

export async function GET() {
  const { supabase, denied } = await requireAdminOrResponse();
  if (denied) return denied;

  const [{ data: stages, error: sErr }, { data: cfg, error: cErr }] = await Promise.all([
    supabase
      .from("stage_scoring_config")
      .select("stage_slug, correct_points, incorrect_points")
      .eq("season_year", 2026),
    supabase
      .from("scoring_config")
      .select("match_bonus_points, tournament_slot_points")
      .eq("season_year", 2026)
      .maybeSingle(),
  ]);

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

  const bySlug = new Map(
    (stages ?? []).map((s) => [s.stage_slug as string, s]),
  );

  const ordered = STAGE_ORDER.map((slug) => {
    const row = bySlug.get(slug);
    return {
      stage_slug: slug,
      label: STAGE_LABEL[slug],
      correct_points: Number(row?.correct_points ?? 0),
      incorrect_points: Number(row?.incorrect_points ?? 0),
    };
  });

  let slotPoints: number[] = [2, 2, 2, 2, 2];
  const raw = cfg?.tournament_slot_points;
  if (Array.isArray(raw)) slotPoints = raw.map((n) => Number(n));
  else if (typeof raw === "string") {
    try {
      slotPoints = JSON.parse(raw);
    } catch {
      /* default */
    }
  }

  return NextResponse.json({
    season_year: 2026,
    stages: ordered,
    tournament_slot_points: slotPoints,
    match_bonus_points: Number(cfg?.match_bonus_points ?? 2),
  });
}

export async function PATCH(request: Request) {
  const { supabase, denied } = await requireAdminOrResponse();
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as
    | {
        stages?: { stage_slug: string; correct_points: number; incorrect_points: number }[];
        tournament_slot_points?: number[];
        match_bonus_points?: number;
      }
    | null;

  if (!body) return NextResponse.json({ error: "VALIDATION" }, { status: 400 });

  const now = new Date().toISOString();

  if (Array.isArray(body.stages)) {
    for (const s of body.stages) {
      if (!STAGE_ORDER.includes(s.stage_slug as TournamentStageSlug)) {
        return NextResponse.json({ error: "INVALID_STAGE" }, { status: 400 });
      }
      const { error } = await supabase.from("stage_scoring_config").upsert(
        {
          season_year: 2026,
          stage_slug: s.stage_slug,
          correct_points: s.correct_points,
          incorrect_points: s.incorrect_points,
          updated_at: now,
        },
        { onConflict: "season_year,stage_slug" },
      );
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const cfgPatch: Record<string, unknown> = { updated_at: now };
  if (body.tournament_slot_points !== undefined) {
    cfgPatch.tournament_slot_points = body.tournament_slot_points;
  }
  if (body.match_bonus_points !== undefined) {
    cfgPatch.match_bonus_points = body.match_bonus_points;
  }
  if (Object.keys(cfgPatch).length > 1) {
    const { error } = await supabase
      .from("scoring_config")
      .update(cfgPatch)
      .eq("season_year", 2026);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "Scoring configuration saved." });
}
