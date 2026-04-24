import type { SupabaseClient } from "@supabase/supabase-js";
import { getPointsLedgerForUser } from "@/lib/data/points-ledger";
import { compareMatchOrder } from "@/lib/matches/match-order";

const SEASON_YEAR = 2026;

function sumLedger(
  ledger: { source_type: string; source_id: string; points_delta: number | null }[],
  pred: (l: (typeof ledger)[0]) => boolean,
): number {
  return ledger.filter(pred).reduce((s, l) => s + Number(l.points_delta ?? 0), 0);
}

export async function getHistoryRows(supabase: SupabaseClient, userId: string) {
  const { data: predictions } = await supabase
    .from("predictions")
    .select("id, match_id, predicted_winner, bonus_pick, updated_at")
    .eq("user_id", userId);
  const { data: answers } = await supabase
    .from("tournament_answers")
    .select("id, question_id, answer_text, updated_at")
    .eq("user_id", userId);
  const ledger = await getPointsLedgerForUser(supabase, userId);

  const matchIds = [...new Set((predictions ?? []).map((p) => p.match_id as string))];
  const questionIds = [...new Set((answers ?? []).map((a) => a.question_id as string))];

  let matches: {
    id: string;
    external_key: string | null;
    home_team: string;
    away_team: string;
    match_time_utc: string;
    scored_at: string | null;
    status: string;
  }[] = [];
  if (matchIds.length > 0) {
    const { data } = await supabase
      .from("matches")
      .select("id, external_key, home_team, away_team, match_time_utc, scored_at, status")
      .in("id", matchIds);
    matches = data ?? [];
  }

  const questionMeta = new Map<
    string,
    { scored_at: string | null; question_text: string; slot_no: number | null }
  >();
  if (questionIds.length > 0) {
    const { data: qs } = await supabase
      .from("tournament_questions")
      .select("id, scored_at, question_text, slot_no")
      .in("id", questionIds);
    for (const q of qs ?? []) {
      questionMeta.set(q.id as string, {
        scored_at: (q.scored_at as string | null) ?? null,
        question_text: String((q as { question_text?: string }).question_text ?? "").trim(),
        slot_no:
          (q as { slot_no?: number | null }).slot_no == null
            ? null
            : Number((q as { slot_no?: number | null }).slot_no),
      });
    }
  }

  let bonusAnswerRows: { match_id: string; prompt_id: string; answer_text: string }[] = [];
  if (matchIds.length > 0) {
    const res = await supabase
      .from("prediction_bonus_answers")
      .select("match_id, prompt_id, answer_text")
      .eq("user_id", userId)
      .in("match_id", matchIds);
    bonusAnswerRows = res.data ?? [];
  }

  const bonusPromptIds = [...new Set((bonusAnswerRows ?? []).map((r) => r.prompt_id as string))];
  let promptOrder = new Map<string, { prompt_text: string; display_order: number }>();
  if (bonusPromptIds.length > 0) {
    const { data: promptRows } = await supabase
      .from("bonus_prompts")
      .select("id, prompt_text, display_order")
      .in("id", bonusPromptIds)
      .eq("season_year", SEASON_YEAR);
    promptOrder = new Map(
      (promptRows ?? []).map((pr) => [
        pr.id as string,
        {
          prompt_text: pr.prompt_text as string,
          display_order: Number(pr.display_order ?? 0),
        },
      ]),
    );
  }

  const bonusLinesByMatch = new Map<
    string,
    { prompt_text: string; answer_text: string; display_order: number }[]
  >();
  for (const row of bonusAnswerRows ?? []) {
    const mid = row.match_id as string;
    const pid = row.prompt_id as string;
    const meta = promptOrder.get(pid);
    const prompt_text = meta?.prompt_text ?? "Bonus";
    const display_order = meta?.display_order ?? 0;
    if (!bonusLinesByMatch.has(mid)) bonusLinesByMatch.set(mid, []);
    bonusLinesByMatch.get(mid)!.push({
      prompt_text,
      answer_text: (row.answer_text as string) ?? "",
      display_order,
    });
  }
  for (const [, lines] of bonusLinesByMatch) {
    lines.sort((a, b) =>
      a.display_order !== b.display_order
        ? a.display_order - b.display_order
        : a.prompt_text.localeCompare(b.prompt_text),
    );
  }

  const matchById = new Map(matches.map((m) => [m.id, m]));
  const matchLabel = new Map(
    matches.map((m) => [
      m.id,
      m.external_key
        ? `${m.external_key} — ${m.home_team} vs ${m.away_team}`
        : `${m.home_team} vs ${m.away_team}`,
    ]),
  );

  const predictionsOrdered = [...(predictions ?? [])].sort((pa, pb) => {
    const ma = matchById.get(pa.match_id as string);
    const mb = matchById.get(pb.match_id as string);
    return compareMatchOrder(
      mb?.external_key ?? null,
      mb?.match_time_utc ?? null,
      ma?.external_key ?? null,
      ma?.match_time_utc ?? null,
    );
  });

  const matchRows = predictionsOrdered.map((p) => {
    const mid = p.match_id as string;
    const m = matchById.get(mid);
    const ledgerPts = sumLedger(
      ledger,
      (l) =>
        (l.source_type === "match" || l.source_type === "bonus") && l.source_id === mid,
    );
    const matchFinal =
      m != null &&
      (m.scored_at != null || String(m.status).toLowerCase() === "completed");
    const bonusLines = bonusLinesByMatch.get(mid) ?? [];
    const legacyBonus = (p.bonus_pick as string | null)?.trim() ?? "";
    const lines: string[] = [p.predicted_winner as string];
    for (const b of bonusLines) {
      lines.push(`${b.prompt_text}: ${b.answer_text}`);
    }
    if (bonusLines.length === 0 && legacyBonus) {
      lines.push(`Legacy bonus: ${legacyBonus}`);
    }
    return {
      type: "match" as const,
      source_id: p.id as string,
      label: matchLabel.get(mid) ?? `Match ${mid}`,
      prediction: lines.join("\n"),
      points_delta: matchFinal ? ledgerPts : null,
      status: matchFinal ? ("final" as const) : ("pending" as const),
      updated_at: p.updated_at as string,
    };
  });

  const answerRows = (answers ?? []).map((a) => {
    const qid = a.question_id as string;
    const meta = questionMeta.get(qid);
    const ledgerPts = sumLedger(
      ledger,
      (l) => l.source_type === "tournament_question" && l.source_id === qid,
    );
    const qFinal = meta?.scored_at != null;
    const questionLabel = meta?.question_text || "Mega Bonus question";
    const slot = meta?.slot_no;
    const label =
      slot != null && Number.isFinite(slot)
        ? `Q${slot}: ${questionLabel}`
        : questionLabel;
    return {
      type: "tournament_question" as const,
      source_id: a.id as string,
      label,
      prediction: a.answer_text as string,
      points_delta: qFinal ? ledgerPts : null,
      status: qFinal ? ("final" as const) : ("pending" as const),
      updated_at: a.updated_at as string,
    };
  });

  return [...matchRows, ...answerRows];
}
