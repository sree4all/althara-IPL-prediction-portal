import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSeasonConfig, getTournamentBonusPrompts } from "@/lib/data/mvp2-repositories";
import { isSeasonBonusesTabVisible } from "@/lib/utils/season-bonuses-tab";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const cfg = await getSeasonConfig(supabase, 2026);
  const tabVisible = isSeasonBonusesTabVisible(
    cfg
      ? {
          season_bonuses_visible_after_utc: cfg.season_bonuses_visible_after_utc ?? null,
          season_bonuses_revealed_by_admin: Boolean(cfg.season_bonuses_revealed_by_admin),
        }
      : null,
  );
  if (!tabVisible) {
    return NextResponse.json({
      season_bonuses_tab_visible: false,
      prompts: [],
      answers: [],
    });
  }

  const prompts = await getTournamentBonusPrompts(supabase, 2026);
  if (!prompts.length) {
    return NextResponse.json({ season_bonuses_tab_visible: true, prompts: [], answers: [] });
  }
  const ids = prompts.map((p) => p.id);
  const { data: answers } = await supabase
    .from("prediction_bonus_answers")
    .select("prompt_id, answer_text")
    .eq("user_id", user.id)
    .is("match_id", null)
    .in("prompt_id", ids);

  return NextResponse.json({
    season_bonuses_tab_visible: true,
    prompts,
    answers: answers ?? [],
  });
}
