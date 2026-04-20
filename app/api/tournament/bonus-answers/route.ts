import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSeasonConfig } from "@/lib/data/mvp2-repositories";
import { normAnswer } from "@/lib/scoring/normalize";
import { isSeasonBonusesTabVisible } from "@/lib/utils/season-bonuses-tab";
import { isTournamentAnswersLocked } from "@/lib/utils/tournament-lock";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const cfg = await getSeasonConfig(supabase, 2026);
  if (
    !isSeasonBonusesTabVisible(
      cfg
        ? {
            season_bonuses_visible_after_utc: cfg.season_bonuses_visible_after_utc ?? null,
            season_bonuses_revealed_by_admin: Boolean(cfg.season_bonuses_revealed_by_admin),
          }
        : null,
    )
  ) {
    return NextResponse.json({ error: "SEASON_BONUSES_TAB_HIDDEN" }, { status: 403 });
  }
  const lock = cfg?.answer_lock_utc ?? null;
  if (isTournamentAnswersLocked(lock)) {
    return NextResponse.json({ error: "TOURNAMENT_LOCKED" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | { bonus_answers?: { prompt_id: string; answer_text: string }[] }
    | null;
  const bonus_answers = body?.bonus_answers;
  if (!bonus_answers?.length) {
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  }

  const promptIds = [...new Set(bonus_answers.map((b) => b.prompt_id))];
  const { data: prompts, error: prErr } = await supabase
    .from("bonus_prompts")
    .select("id, scope, match_id, is_active, input_type")
    .in("id", promptIds)
    .eq("is_active", true);
  if (prErr) return NextResponse.json({ error: prErr.message }, { status: 500 });

  const promptById = new Map((prompts ?? []).map((p) => [p.id as string, p]));

  const { data: optRows } = await supabase
    .from("bonus_prompt_options")
    .select("prompt_id, value")
    .in("prompt_id", promptIds);
  const optionValuesByPrompt = new Map<string, Set<string>>();
  for (const row of optRows ?? []) {
    const pid = row.prompt_id as string;
    if (!optionValuesByPrompt.has(pid)) optionValuesByPrompt.set(pid, new Set());
    optionValuesByPrompt.get(pid)!.add(normAnswer(row.value as string));
  }

  const nowIso = new Date().toISOString();

  for (const b of bonus_answers) {
    const text = (b.answer_text ?? "").trim();
    if (!text) continue;
    const pr = promptById.get(b.prompt_id);
    if (!pr) {
      return NextResponse.json({ error: "UNKNOWN_BONUS_PROMPT" }, { status: 400 });
    }
    if (pr.scope !== "tournament" || pr.match_id != null) {
      return NextResponse.json({ error: "NOT_TOURNAMENT_PROMPT" }, { status: 400 });
    }
    const it = (pr as { input_type?: string }).input_type;
    if (it === "single_choice") {
      const allowed = optionValuesByPrompt.get(b.prompt_id);
      if (!allowed || allowed.size === 0) {
        return NextResponse.json({ error: "BONUS_OPTIONS_NOT_CONFIGURED" }, { status: 400 });
      }
      if (!allowed.has(normAnswer(text))) {
        return NextResponse.json({ error: "INVALID_BONUS_OPTION" }, { status: 400 });
      }
    }

    const { data: existing, error: sErr } = await supabase
      .from("prediction_bonus_answers")
      .select("id")
      .eq("user_id", user.id)
      .eq("prompt_id", b.prompt_id)
      .is("match_id", null)
      .maybeSingle();
    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

    if (existing?.id) {
      const { error: uErr } = await supabase
        .from("prediction_bonus_answers")
        .update({ answer_text: text, updated_at: nowIso })
        .eq("id", existing.id);
      if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
    } else {
      const { error: iErr } = await supabase.from("prediction_bonus_answers").insert({
        user_id: user.id,
        match_id: null,
        prompt_id: b.prompt_id,
        answer_text: text,
        updated_at: nowIso,
      });
      if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    message: "Season bonus prompt answers saved.",
  });
}
