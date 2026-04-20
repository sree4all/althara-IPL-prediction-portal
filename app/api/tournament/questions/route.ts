import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getSeasonConfig,
  getTournamentQuestions,
  getTournamentQuestionOptionsForQuestions,
} from "@/lib/data/mvp2-repositories";
import { isSeasonBonusesTabVisible } from "@/lib/utils/season-bonuses-tab";
import { isTournamentAnswersLocked } from "@/lib/utils/tournament-lock";

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
    const lock = cfg?.answer_lock_utc ?? null;
    return NextResponse.json({
      season_bonuses_tab_visible: false,
      season_bonuses_unlock_utc: cfg?.season_bonuses_visible_after_utc ?? null,
      answer_lock_utc: lock,
      is_locked: isTournamentAnswersLocked(lock),
      mega_bonus_all_answers_visible: Boolean(cfg?.mega_bonus_all_answers_visible),
      questions: [],
      answers: [],
    });
  }

  const allQuestions = await getTournamentQuestions(supabase, 2026);
  const visible = allQuestions.filter((q) => Boolean(q.is_active));
  const qids = visible.map((q) => q.id as string);
  const options = await getTournamentQuestionOptionsForQuestions(supabase, qids);
  const optByQ = new Map<string, typeof options>();
  for (const o of options) {
    const qid = o.question_id as string;
    if (!optByQ.has(qid)) optByQ.set(qid, []);
    optByQ.get(qid)!.push(o);
  }
  const questionsOut = visible.map((q) => ({
    id: q.id,
    slot_no: q.slot_no,
    question_text: q.question_text,
    options: optByQ.get(q.id as string) ?? [],
  }));

  const { data: answers } = await supabase
    .from("tournament_answers")
    .select("question_id, answer_text")
    .eq("user_id", user.id);

  const lock = cfg?.answer_lock_utc ?? null;
  return NextResponse.json({
    season_bonuses_tab_visible: true,
    answer_lock_utc: lock,
    is_locked: isTournamentAnswersLocked(lock),
    mega_bonus_all_answers_visible: Boolean(cfg?.mega_bonus_all_answers_visible),
    questions: questionsOut,
    answers: answers ?? [],
  });
}

