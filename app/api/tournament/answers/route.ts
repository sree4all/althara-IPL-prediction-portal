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

  const body = (await request.json().catch(() => null)) as
    | { answers?: { question_id: string; answer_text: string }[] }
    | null;
  if (!body?.answers || body.answers.length === 0) {
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  }

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
    return NextResponse.json({ error: "TOURNAMENT_ANSWERS_LOCKED" }, { status: 403 });
  }

  const qids = [...new Set(body.answers.map((a) => a.question_id))];
  const { data: optRows, error: optErr } = await supabase
    .from("tournament_question_options")
    .select("question_id, value")
    .in("question_id", qids);
  if (optErr) {
    return NextResponse.json({ error: optErr.message }, { status: 500 });
  }
  const optionValuesByQuestion = new Map<string, Set<string>>();
  for (const row of optRows ?? []) {
    const qid = row.question_id as string;
    if (!optionValuesByQuestion.has(qid)) optionValuesByQuestion.set(qid, new Set());
    optionValuesByQuestion.get(qid)!.add(normAnswer(row.value as string));
  }

  for (const a of body.answers) {
    const t = (a.answer_text ?? "").trim();
    if (!t) continue;
    const allowed = optionValuesByQuestion.get(a.question_id);
    if (allowed && allowed.size > 0 && !allowed.has(normAnswer(t))) {
      return NextResponse.json({ error: "INVALID_TOURNAMENT_OPTION" }, { status: 400 });
    }
  }

  const payload = body.answers.map((a) => ({
    user_id: user.id,
    question_id: a.question_id,
    answer_text: a.answer_text,
    answered_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("tournament_answers").upsert(payload, {
    onConflict: "user_id,question_id",
  });
  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("TOURNAMENT_ANSWERS_LOCKED") || error.code === "P0001") {
      return NextResponse.json({ error: "TOURNAMENT_ANSWERS_LOCKED" }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    ok: true,
    message: "Mega Bonus slot answers saved.",
  });
}

