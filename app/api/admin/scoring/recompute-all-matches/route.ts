import { NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/auth/require-admin";
import { recomputeAllCompletedMatchScoring } from "@/lib/scoring/recompute-all-match-scoring";

/** Re-run ledger + profile updates for every completed match (repair / backfill). */
export async function POST() {
  const { supabase, denied } = await requireAdminOrResponse();
  if (denied) return denied;

  const result = await recomputeAllCompletedMatchScoring(supabase, 2026);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    processed: result.processed,
    failures: result.failures,
  });
}
