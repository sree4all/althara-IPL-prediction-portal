import type { SupabaseClient } from "@supabase/supabase-js";

const SEASON_YEAR = 2026;

export type MegaBonusGridRow = {
  user_id: string;
  display_name: string;
  answers: string[];
};

export type MegaBonusGridPayload = {
  season_year: number;
  slot_numbers: number[];
  rows: MegaBonusGridRow[];
};

/** Slot questions (Q1…Qn) answers per user — shared by admin + public APIs. */
export async function fetchMegaBonusSlotAnswersGrid(
  supabase: SupabaseClient,
): Promise<{ data: MegaBonusGridPayload; error: { message: string } | null }> {
  const { data: questions, error: qErr } = await supabase
    .from("tournament_questions")
    .select("id, slot_no")
    .eq("season_year", SEASON_YEAR)
    .order("slot_no", { ascending: true });

  if (qErr) {
    return { data: { season_year: SEASON_YEAR, slot_numbers: [], rows: [] }, error: { message: qErr.message } };
  }

  const slotNumbers = (questions ?? []).map((q) => Number(q.slot_no ?? 0)).filter((n) => n > 0);
  const questionIds = new Set((questions ?? []).map((q) => q.id as string));
  const slotByQuestionId = new Map<string, number>();
  for (const q of questions ?? []) {
    slotByQuestionId.set(q.id as string, Number(q.slot_no ?? 0));
  }

  if (questionIds.size === 0) {
    return { data: { season_year: SEASON_YEAR, slot_numbers: [], rows: [] }, error: null };
  }

  const { data: answerRows, error: aErr } = await supabase
    .from("tournament_answers")
    .select("user_id, question_id, answer_text")
    .in("question_id", [...questionIds]);

  if (aErr) {
    return { data: { season_year: SEASON_YEAR, slot_numbers: [], rows: [] }, error: { message: aErr.message } };
  }

  const byUser = new Map<string, Map<number, string>>();
  for (const row of answerRows ?? []) {
    const qid = row.question_id as string;
    const slot = slotByQuestionId.get(qid);
    if (slot === undefined || slot <= 0) continue;
    const uid = row.user_id as string;
    const text = String((row.answer_text as string) ?? "").trim();
    if (!byUser.has(uid)) byUser.set(uid, new Map());
    byUser.get(uid)!.set(slot, text);
  }

  const userIds = [...byUser.keys()];
  if (userIds.length === 0) {
    return {
      data: { season_year: SEASON_YEAR, slot_numbers: slotNumbers, rows: [] },
      error: null,
    };
  }

  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", userIds);

  if (pErr) {
    return { data: { season_year: SEASON_YEAR, slot_numbers: [], rows: [] }, error: { message: pErr.message } };
  }

  const nameById = new Map((profiles ?? []).map((p) => [p.id as string, (p.display_name as string) || ""]));

  const rows = userIds
    .map((uid) => {
      const m = byUser.get(uid)!;
      const answers = slotNumbers.map((sn) => m.get(sn) ?? "");
      return {
        user_id: uid,
        display_name: (nameById.get(uid) || "").trim() || "(no name)",
        answers,
      };
    })
    .sort((a, b) => a.display_name.localeCompare(b.display_name, undefined, { sensitivity: "base" }));

  return {
    data: { season_year: SEASON_YEAR, slot_numbers: slotNumbers, rows },
    error: null,
  };
}
