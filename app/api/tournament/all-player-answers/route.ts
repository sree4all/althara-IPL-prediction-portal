import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getSeasonConfig } from "@/lib/data/mvp2-repositories";
import { fetchMegaBonusSlotAnswersGrid } from "@/lib/data/mega-bonus-slot-answers-grid";

const SEASON_YEAR = 2026;

/** Mega Bonus slot answers grid for all users (when enabled in config, or caller is admin). */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const isAdmin = profile?.role === "admin";

  const cfg = await getSeasonConfig(supabase, SEASON_YEAR);
  const publicOn = Boolean(cfg?.mega_bonus_all_answers_visible);

  if (!isAdmin && !publicOn) {
    return NextResponse.json(
      { error: "MEGA_BONUS_ALL_ANSWERS_HIDDEN", message: "An admin has not enabled sharing all player answers yet." },
      { status: 403 },
    );
  }

  let service;
  try {
    service = createServiceClient();
  } catch (e) {
    return NextResponse.json(
      {
        error: "SERVICE_UNAVAILABLE",
        message:
          (e as Error).message ??
          "Server cannot read all player answers (missing service credentials).",
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
