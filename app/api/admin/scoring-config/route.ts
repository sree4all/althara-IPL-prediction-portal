import { NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/auth/require-admin";

export async function GET() {
  const { supabase, denied } = await requireAdminOrResponse();
  if (denied) return denied;
  const { data, error } = await supabase
    .from("scoring_config")
    .select("season_year, match_winner_points, match_bonus_points, tournament_slot_points, updated_at")
    .eq("season_year", 2026)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ config: data });
}

export async function PATCH(request: Request) {
  const { supabase, denied } = await requireAdminOrResponse();
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as
    | {
        match_winner_points?: number;
        match_bonus_points?: number;
        tournament_slot_points?: number[];
      }
    | null;
  if (!body) return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.match_winner_points !== undefined) patch.match_winner_points = body.match_winner_points;
  if (body.match_bonus_points !== undefined) patch.match_bonus_points = body.match_bonus_points;
  if (body.tournament_slot_points !== undefined) {
    patch.tournament_slot_points = body.tournament_slot_points;
  }
  const { error } = await supabase.from("scoring_config").update(patch).eq("season_year", 2026);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, message: "Scoring config saved." });
}
