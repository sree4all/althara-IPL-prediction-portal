import { NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/auth/require-admin";
import { fetchMegaBonusSlotAnswersGrid } from "@/lib/data/mega-bonus-slot-answers-grid";

/** @deprecated Use GET /api/tournament/all-player-answers (admin may always call). */
export async function GET() {
  const { supabase, denied } = await requireAdminOrResponse();
  if (denied) return denied;

  const { data, error } = await fetchMegaBonusSlotAnswersGrid(supabase);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
