import { NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/auth/require-admin";

const SEASON_YEAR = 2026;

/** Toggle whether all signed-in users may view the Mega Bonus slot answers grid. */
export async function PATCH(request: Request) {
  const { supabase, denied } = await requireAdminOrResponse();
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as { mega_bonus_all_answers_visible?: boolean } | null;
  if (body == null || typeof body.mega_bonus_all_answers_visible !== "boolean") {
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("tournament_config")
    .update({
      mega_bonus_all_answers_visible: body.mega_bonus_all_answers_visible,
      updated_at: now,
    })
    .eq("season_year", SEASON_YEAR);

  if (error?.message?.includes("mega_bonus_all_answers_visible")) {
    return NextResponse.json(
      { error: error.message, hint: "Apply migration 0023_mega_bonus_all_answers_visible.sql" },
      { status: 500 },
    );
  }
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, mega_bonus_all_answers_visible: body.mega_bonus_all_answers_visible });
}
