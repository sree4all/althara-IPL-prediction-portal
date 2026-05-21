import { NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/auth/require-admin";
import {
  KNOCKOUT_SCORING_HINT,
  KNOCKOUT_STAGE_LABEL,
  type KnockoutStage,
} from "@/lib/knockout/constants";
import { isKnockoutMatchReadyForPredictions } from "@/lib/knockout/placeholders";
import { parseKnockoutStage } from "@/lib/knockout/scoring";

const STAGE_ORDER: KnockoutStage[] = ["q1", "eliminator", "q2", "final"];

export async function GET() {
  const { supabase, denied } = await requireAdminOrResponse();
  if (denied) return denied;

  const { data, error } = await supabase
    .from("matches")
    .select(
      "id, external_key, home_team, away_team, match_time_utc, status, winner, scored_at, knockout_stage",
    )
    .not("knockout_stage", "is", null)
    .order("match_time_utc", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const matches = (data ?? []).map((m) => {
    const stage = parseKnockoutStage(m.knockout_stage as string | null);
    return {
      id: m.id,
      external_key: m.external_key,
      home_team: m.home_team,
      away_team: m.away_team,
      match_time_utc: m.match_time_utc,
      status: m.status,
      winner: m.winner,
      scored_at: m.scored_at,
      knockout_stage: stage,
      stage_label: stage ? KNOCKOUT_STAGE_LABEL[stage] : null,
      scoring_hint: stage ? KNOCKOUT_SCORING_HINT[stage] : null,
      teams_ready: isKnockoutMatchReadyForPredictions(
        m.home_team as string,
        m.away_team as string,
      ),
    };
  });

  matches.sort((a, b) => {
    const ai = STAGE_ORDER.indexOf(a.knockout_stage ?? "q1");
    const bi = STAGE_ORDER.indexOf(b.knockout_stage ?? "q1");
    return ai - bi;
  });

  return NextResponse.json({ matches });
}

export async function PATCH(request: Request) {
  const { supabase, denied } = await requireAdminOrResponse();
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as
    | {
        team_1?: string;
        team_2?: string;
        team_3?: string;
        team_4?: string;
      }
    | null;

  if (!body) {
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  }

  const t1 = body.team_1?.trim();
  const t2 = body.team_2?.trim();
  const t3 = body.team_3?.trim();
  const t4 = body.team_4?.trim();

  if (!t1 || !t2 || !t3 || !t4) {
    return NextResponse.json(
      { error: "All four teams (1–4) are required for Qualifier 1 and Eliminator." },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();

  const { data: q1, error: q1Err } = await supabase
    .from("matches")
    .update({ home_team: t1, away_team: t2, updated_at: now })
    .eq("external_key", "M71")
    .eq("knockout_stage", "q1")
    .neq("status", "completed")
    .select("id")
    .maybeSingle();

  if (q1Err) {
    return NextResponse.json({ error: q1Err.message }, { status: 500 });
  }
  if (!q1) {
    return NextResponse.json(
      { error: "Qualifier 1 (M71) not found or already completed." },
      { status: 400 },
    );
  }

  const { data: elim, error: elimErr } = await supabase
    .from("matches")
    .update({ home_team: t3, away_team: t4, updated_at: now })
    .eq("external_key", "M72")
    .eq("knockout_stage", "eliminator")
    .neq("status", "completed")
    .select("id")
    .maybeSingle();

  if (elimErr) {
    return NextResponse.json({ error: elimErr.message }, { status: 500 });
  }
  if (!elim) {
    return NextResponse.json(
      { error: "Eliminator (M72) not found or already completed." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: `Knockout seeds saved. M71: ${t1} vs ${t2}. M72: ${t3} vs ${t4}.`,
    m71: { home_team: t1, away_team: t2 },
    m72: { home_team: t3, away_team: t4 },
  });
}
