import { NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/auth/require-admin";
import { applyTournamentScoring } from "@/lib/scoring/tournament-scoring";

export async function POST(request: Request) {
  const { supabase, denied } = await requireAdminOrResponse();
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as { season_year?: number } | null;
  const seasonYear = body?.season_year ?? 2026;

  const result = await applyTournamentScoring(supabase, seasonYear);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    message: `Tournament scoring applied. ${result.ledgerRows} ledger row(s) written.`,
    ledger_rows: result.ledgerRows,
  });
}
