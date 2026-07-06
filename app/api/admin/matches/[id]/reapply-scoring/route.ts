import { NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/auth/require-admin";
import { fixtureNumber } from "@/lib/matches/dedupe-by-match-number";
import {
  applyForecastScoring,
  isForecastScoringMatch,
} from "@/lib/scoring/forecast-scoring";
import { applyMatchScoring } from "@/lib/scoring/match-scoring";

/** Re-run ledger + profile updates if a previous apply failed after the match row was saved. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, denied } = await requireAdminOrResponse();
  if (denied) return denied;
  const { id: matchId } = await params;

  const { data: match } = await supabase
    .from("matches")
    .select("match_number, external_key")
    .eq("id", matchId)
    .maybeSingle();

  const result = await applyMatchScoring(supabase, matchId, 2026);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  let forecastLedgerRows = 0;
  if (isForecastScoringMatch(fixtureNumber(match))) {
    const forecastResult = await applyForecastScoring(supabase, 2026);
    if (!forecastResult.ok) {
      return NextResponse.json({ error: forecastResult.error }, { status: 500 });
    }
    forecastLedgerRows = forecastResult.ledgerRows;
  }

  return NextResponse.json({
    ok: true,
    ledger_rows: result.ledgerRows,
    forecast_ledger_rows: forecastLedgerRows,
  });
}
