import { NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/auth/require-admin";
import { syncProfilePointsFromLedger } from "@/lib/scoring/sync-profile-points";

export const maxDuration = 120;

/** Rebuild every profile's current_points from points_ledger (no terminal needed). */
export async function POST() {
  const { supabase, denied } = await requireAdminOrResponse();
  if (denied) return denied;

  try {
    const result = await syncProfilePointsFromLedger(supabase);
    return NextResponse.json({
      ok: true,
      updated: result.updated,
      unchanged: result.unchanged,
      message: `Synced ${result.updated} profile(s) from the points ledger.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
