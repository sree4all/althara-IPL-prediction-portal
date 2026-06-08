import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isMatchReadyForPredictions } from "@/lib/fifa/match-ready";
import { parseTournamentStage, stageScoringHint } from "@/lib/fifa/stages";
import { loadStageScoringMap } from "@/lib/scoring/stage-scoring";
import {
  dedupeMatchesByFixtureNumber,
  fixtureNumber,
  idsByFixtureNumber,
} from "@/lib/matches/dedupe-by-match-number";
import { isMatchLocked } from "@/lib/utils/match-lock";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const [{ data: matches, error }, stageMap] = await Promise.all([
    supabase
      .from("matches")
      .select(
        "id, external_key, home_team, away_team, match_time_utc, status, winner, tournament_stage",
      )
      .order("match_time_utc", { ascending: true }),
    loadStageScoringMap(supabase, 2026),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const allMatches = (matches ?? []) as {
    id: string;
    external_key: string | null;
    home_team: string;
    away_team: string;
    match_time_utc: string;
    status: string;
    winner: string | null;
    tournament_stage: string | null;
    match_number?: number | null;
  }[];
  const uniqueMatches = dedupeMatchesByFixtureNumber(allMatches);
  const aliasIdsByFixture = idsByFixtureNumber(allMatches);

  const serverTimeUtc = new Date().toISOString();
  const now = new Date();

  const openWindow = uniqueMatches.filter(
    (m) => !isMatchLocked(new Date(m.match_time_utc as string), now),
  );
  const openFixtureNumbers = new Set(
    openWindow.map((m) => fixtureNumber(m)).filter((n): n is number => n != null),
  );
  const openMatchIds = [
    ...new Set(
      allMatches
        .filter((m) => {
          const n = fixtureNumber(m);
          return n != null && openFixtureNumbers.has(n);
        })
        .map((m) => m.id),
    ),
  ];
  const { data: predictionRows } =
    openMatchIds.length > 0
      ? await supabase
          .from("predictions")
          .select("match_id, predicted_winner")
          .eq("user_id", user.id)
          .in("match_id", openMatchIds)
      : { data: [] };
  const predictedByMatchId = new Map(
    (predictionRows ?? []).map((r) => [
      r.match_id as string,
      (r.predicted_winner as string | null) ?? null,
    ]),
  );

  const payload = openWindow.map((m) => {
    const matchTimeUtc = new Date(m.match_time_utc as string);
    const locked = isMatchLocked(matchTimeUtc, now);
    const stageSlug = parseTournamentStage(m.tournament_stage as string | null);
    const teamsPending = !isMatchReadyForPredictions(
      m.home_team as string,
      m.away_team as string,
    );
    const stageRow = stageSlug ? stageMap.get(stageSlug) : null;
    const scoringHint = stageRow
      ? stageScoringHint(stageSlug, stageRow.correct_points, stageRow.incorrect_points)
      : null;
    const label = m.external_key
      ? `${m.external_key} — ${m.home_team} vs ${m.away_team}`
      : `${m.home_team} vs ${m.away_team}`;
    const fixtureNo = fixtureNumber(m);
    const aliasIds =
      fixtureNo != null ? (aliasIdsByFixture.get(fixtureNo) ?? [m.id as string]) : [m.id as string];
    const predictedWinner =
      aliasIds.map((id) => predictedByMatchId.get(id)).find((v) => v != null && v !== "") ??
      null;
    return {
      id: m.id,
      label,
      home_team: m.home_team,
      away_team: m.away_team,
      match_time_utc: m.match_time_utc,
      status: m.status,
      client_lock_hint: locked || teamsPending,
      winner: m.winner,
      has_prediction: predictedWinner != null,
      predicted_winner: predictedWinner,
      tournament_stage: stageSlug,
      teams_pending: teamsPending,
      stage_scoring_hint: scoringHint,
    };
  });

  return NextResponse.json({
    matches: payload,
    server_time_utc: serverTimeUtc,
  });
}
