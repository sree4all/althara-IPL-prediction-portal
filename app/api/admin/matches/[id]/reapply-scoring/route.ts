import { NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/auth/require-admin";
import { applyMatchScoring } from "@/lib/scoring/match-scoring";

/** Re-run ledger + profile updates if a previous apply failed after the match row was saved. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, denied } = await requireAdminOrResponse();
  if (denied) return denied;
  const { id: matchId } = await params;

  const result = await applyMatchScoring(supabase, matchId, 2026);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true, ledger_rows: result.ledgerRows });
}
