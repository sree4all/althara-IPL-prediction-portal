import { NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/auth/require-admin";
import { fetchMegaBonusSlotAnswersGrid } from "@/lib/data/mega-bonus-slot-answers-grid";
import { createServiceClient } from "@/lib/supabase/service";

/** @deprecated Use GET /api/tournament/all-player-answers (admin may always call). */
export async function GET() {
  const { denied } = await requireAdminOrResponse();
  if (denied) return denied;

  let service;
  try {
    service = createServiceClient();
  } catch (e) {
    return NextResponse.json(
      {
        error: "SERVICE_UNAVAILABLE",
        message: (e as Error).message ?? "Missing Supabase service credentials.",
      },
      { status: 503 },
    );
  }

  const { data, error } = await fetchMegaBonusSlotAnswersGrid(service);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
