import { NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/auth/require-admin";
import {
  allowedWinnerPicks,
  isMatchReadyForPredictions,
} from "@/lib/fifa/match-ready";
import { fixtureNumber } from "@/lib/matches/dedupe-by-match-number";
import { createServiceClient } from "@/lib/supabase/service";
import { isMatchLocked } from "@/lib/utils/match-lock";

const LOCK_MSG =
  "Predictions for this match locked at kickoff (IST). This match is now locked.";

/** Admin: fetch a member's prediction for a match (if any). */
export async function GET(request: Request) {
  const { denied } = await requireAdminOrResponse();
  if (denied) return denied;

  const url = new URL(request.url);
  const userId = url.searchParams.get("user_id")?.trim();
  const matchId = url.searchParams.get("match_id")?.trim();
  if (!userId || !matchId) {
    return NextResponse.json({ error: "Provide user_id and match_id" }, { status: 400 });
  }

  let supabase;
  try {
    supabase = createServiceClient();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Service client unavailable";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const { data: prediction, error } = await supabase
    .from("predictions")
    .select("id, predicted_winner, updated_at")
    .eq("user_id", userId)
    .eq("match_id", matchId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    prediction: prediction
      ? {
          id: prediction.id as string,
          predicted_winner: prediction.predicted_winner as string,
          updated_at: prediction.updated_at as string,
        }
      : null,
  });
}

/** Admin: add or update a member's match-winner prediction before kickoff. */
export async function POST(request: Request) {
  const { denied } = await requireAdminOrResponse();
  if (denied) return denied;

  let body: {
    user_id?: string;
    match_id?: string;
    predicted_winner?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  }

  const { user_id, match_id, predicted_winner } = body;
  if (!user_id || !match_id || !predicted_winner) {
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  }

  let supabase;
  try {
    supabase = createServiceClient();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Service client unavailable";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user_id)
    .maybeSingle();
  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }
  if (!profile) {
    return NextResponse.json({ error: "PLAYER_NOT_FOUND" }, { status: 404 });
  }

  const { data: match, error: mErr } = await supabase
    .from("matches")
    .select("id, external_key, match_number, match_time_utc, home_team, away_team, status, tournament_stage")
    .eq("id", match_id)
    .maybeSingle();

  if (mErr || !match) {
    return NextResponse.json({ error: "MATCH_NOT_FOUND" }, { status: 404 });
  }

  if (
    match.status === "completed" ||
    match.status === "abandoned" ||
    match.status === "cancelled"
  ) {
    return NextResponse.json({ error: "MATCH_CLOSED" }, { status: 400 });
  }

  const matchTimeUtc = new Date(match.match_time_utc as string);
  if (isMatchLocked(matchTimeUtc)) {
    return NextResponse.json(
      { error: "MATCH_LOCKED", message: LOCK_MSG },
      { status: 403 },
    );
  }

  const home = match.home_team as string;
  const away = match.away_team as string;
  if (!isMatchReadyForPredictions(home, away)) {
    return NextResponse.json(
      {
        error: "TEAMS_PENDING",
        message: "Teams for this match are not set yet.",
      },
      { status: 403 },
    );
  }

  const allowed = allowedWinnerPicks(
    home,
    away,
    fixtureNumber(match),
    match.tournament_stage as string | null,
  );
  if (!allowed.includes(predicted_winner)) {
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("predictions")
    .select("id")
    .eq("user_id", user_id)
    .eq("match_id", match_id)
    .maybeSingle();

  const wasUpdate = !!existing;
  const updatedAt = new Date().toISOString();
  const upsertPayload = {
    user_id,
    match_id,
    predicted_winner,
    bonus_pick: null,
    updated_at: updatedAt,
  };

  const { data: pred, error: pErr } = await supabase
    .from("predictions")
    .upsert(upsertPayload, {
      onConflict: "user_id,match_id",
    })
    .select("id")
    .single();

  if (pErr) {
    const msg = pErr.message ?? "";
    if (msg.includes("MATCH_LOCKED") || pErr.code === "P0001") {
      return NextResponse.json(
        { error: "MATCH_LOCKED", message: LOCK_MSG },
        { status: 403 },
      );
    }
    return NextResponse.json({ error: pErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: wasUpdate ? "Prediction updated." : "Prediction saved.",
    prediction_id: pred?.id,
    match_id,
    user_id,
    predicted_winner,
    updated_at: updatedAt,
    was_update: wasUpdate,
  });
}
