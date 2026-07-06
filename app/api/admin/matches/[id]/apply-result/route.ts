import { NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/auth/require-admin";
import { DRAW_PICK } from "@/lib/fifa/stages";
import { isDrawAllowedForMatch } from "@/lib/fifa/match-ready";
import { fixtureNumber } from "@/lib/matches/dedupe-by-match-number";
import { propagateKnockoutWinner, type PropagationResult } from "@/lib/fifa/bracket-progression";
import { applyMatchScoring } from "@/lib/scoring/match-scoring";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, denied } = await requireAdminOrResponse();
  if (denied) return denied;
  const { id: matchId } = await params;
  const body = (await request.json().catch(() => null)) as
    | {
        winner: string;
        bonus_result?: string | null;
        bonus_prompt_results?: { prompt_id: string; correct_answer: string | null }[];
      }
    | null;
  if (!body?.winner?.trim()) {
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  }

  const { data: match, error: mErr } = await supabase
    .from("matches")
    .select("id, external_key, match_number, home_team, away_team, status, tournament_stage")
    .eq("id", matchId)
    .maybeSingle();
  if (mErr || !match) {
    return NextResponse.json({ error: "MATCH_NOT_FOUND" }, { status: 404 });
  }

  const winner = body.winner.trim();
  const teams = [match.home_team as string, match.away_team as string];
  const drawAllowed = isDrawAllowedForMatch(
    fixtureNumber(match),
    match.tournament_stage as string | null,
  );
  if (winner === DRAW_PICK && !drawAllowed) {
    return NextResponse.json({ error: "DRAW_NOT_ALLOWED" }, { status: 400 });
  }
  if (winner !== DRAW_PICK && !teams.includes(winner)) {
    return NextResponse.json({ error: "WINNER_NOT_VALID" }, { status: 400 });
  }

  const { data: matchPrompts } = await supabase
    .from("bonus_prompts")
    .select("id")
    .eq("season_year", 2026)
    .eq("scope", "match")
    .eq("match_id", matchId);
  const promptIdsForMatch = new Set((matchPrompts ?? []).map((p) => p.id as string));
  const hasMatchPrompts = promptIdsForMatch.size > 0;

  const now = new Date().toISOString();

  if (hasMatchPrompts && Array.isArray(body.bonus_prompt_results)) {
    for (const row of body.bonus_prompt_results) {
      const pid = row.prompt_id;
      if (!pid || !promptIdsForMatch.has(pid)) {
        return NextResponse.json({ error: "INVALID_BONUS_PROMPT_ID" }, { status: 400 });
      }
      const ca =
        row.correct_answer === undefined || row.correct_answer === null
          ? null
          : String(row.correct_answer).trim() || null;
      const { error: pErr } = await supabase
        .from("bonus_prompts")
        .update({ correct_answer: ca, updated_at: now })
        .eq("id", pid)
        .eq("match_id", matchId);
      if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
    }
  }

  const legacyBonus =
    body.bonus_result === undefined || body.bonus_result === null || body.bonus_result === ""
      ? null
      : String(body.bonus_result).trim();

  const bonus_result = hasMatchPrompts ? null : legacyBonus;

  const matchNum = fixtureNumber(match);
  const matchPatch: Record<string, unknown> = {
    winner,
    bonus_result,
    status: "completed",
    updated_at: now,
  };
  if (matchNum != null && match.match_number == null) {
    matchPatch.match_number = matchNum;
  }

  const { error: uErr } = await supabase
    .from("matches")
    .update(matchPatch)
    .eq("id", matchId);
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

  let propagation: PropagationResult = { updated: [], conflicts: [] };
  if (matchNum != null && winner !== DRAW_PICK) {
    propagation = await propagateKnockoutWinner(supabase, matchNum, winner, 2026);
  }

  const result = await applyMatchScoring(supabase, matchId, 2026);
  if (!result.ok) {
    return NextResponse.json({ error: result.error, match_id: matchId }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: `Match scored. ${result.ledgerRows} ledger row(s) written.`,
    match_id: matchId,
    ledger_rows: result.ledgerRows,
    propagation,
  });
}
