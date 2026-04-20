import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normAnswer } from "@/lib/scoring/normalize";
import { isMatchLocked } from "@/lib/utils/match-lock";

const LOCK_MSG =
  "Sorry! The deadline for this match was 30 minutes before start time (GMT). This match is now locked.";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: {
    match_id?: string;
    predicted_winner?: string;
    bonus_answers?: { prompt_id: string; answer_text: string }[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  }

  const { match_id, predicted_winner, bonus_answers } = body;
  // Match-level extras use `bonus_prompts` + `bonus_answers` only (not legacy `bonus_pick`).
  const bonus_pick = null;
  if (!match_id || !predicted_winner) {
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  }

  const { data: match, error: mErr } = await supabase
    .from("matches")
    .select("id, match_time_utc, home_team, away_team, status")
    .eq("id", match_id)
    .maybeSingle();

  if (mErr || !match) {
    return NextResponse.json({ error: "MATCH_NOT_FOUND" }, { status: 404 });
  }

  if (
    match.status === "completed" ||
    match.status === "abandoned" ||
    match.status === "cancelled"
  ) {
    return NextResponse.json({ error: "MATCH_CLOSED" }, { status: 400 });
  }

  const matchTimeUtc = new Date(match.match_time_utc as string);
  if (isMatchLocked(matchTimeUtc)) {
    return NextResponse.json(
      { error: "MATCH_LOCKED", message: LOCK_MSG },
      { status: 403 },
    );
  }

  const winners = [match.home_team, match.away_team];
  if (!winners.includes(predicted_winner)) {
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("predictions")
    .select("id")
    .eq("user_id", user.id)
    .eq("match_id", match_id)
    .maybeSingle();

  const wasUpdate = !!existing;

  const upsertPayload = {
    user_id: user.id,
    match_id,
    predicted_winner,
    bonus_pick,
    updated_at: new Date().toISOString(),
  };

  const { data: pred, error: pErr } = await supabase
    .from("predictions")
    .upsert(upsertPayload, {
      onConflict: "user_id,match_id",
    })
    .select("id")
    .single();

  if (pErr) {
    const msg = pErr.message ?? "";
    if (msg.includes("MATCH_LOCKED") || pErr.code === "P0001") {
      return NextResponse.json(
        { error: "MATCH_LOCKED", message: LOCK_MSG },
        { status: 403 },
      );
    }
    return NextResponse.json({ error: pErr.message }, { status: 500 });
  }

  if (bonus_answers?.length) {
    const promptIds = [...new Set(bonus_answers.map((b) => b.prompt_id))];
    const { data: prompts, error: prErr } = await supabase
      .from("bonus_prompts")
      .select("id, scope, match_id, is_active, input_type")
      .in("id", promptIds)
      .eq("is_active", true);
    if (prErr) {
      return NextResponse.json({ error: prErr.message }, { status: 500 });
    }
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
      if (pr.scope === "tournament") {
        return NextResponse.json({ error: "USE_TOURNAMENT_BONUS_ENDPOINT" }, { status: 400 });
      }
      if (pr.scope === "match" && pr.match_id !== match_id) {
        return NextResponse.json({ error: "BONUS_PROMPT_MATCH_MISMATCH" }, { status: 400 });
      }
      const resolvedMatchId = pr.scope === "tournament" ? null : match_id;

      let sel = supabase
        .from("prediction_bonus_answers")
        .select("id")
        .eq("user_id", user.id)
        .eq("prompt_id", b.prompt_id);
      sel =
        resolvedMatchId === null ? sel.is("match_id", null) : sel.eq("match_id", resolvedMatchId);
      const { data: existing, error: sErr } = await sel.maybeSingle();
      if (sErr) {
        return NextResponse.json({ error: sErr.message }, { status: 500 });
      }
      if (existing?.id) {
        const { error: uErr } = await supabase
          .from("prediction_bonus_answers")
          .update({ answer_text: text, updated_at: nowIso })
          .eq("id", existing.id);
        if (uErr) {
          return NextResponse.json({ error: uErr.message }, { status: 500 });
        }
      } else {
        const { error: iErr } = await supabase.from("prediction_bonus_answers").insert({
          user_id: user.id,
          match_id: resolvedMatchId,
          prompt_id: b.prompt_id,
          answer_text: text,
          updated_at: nowIso,
        });
        if (iErr) {
          return NextResponse.json({ error: iErr.message }, { status: 500 });
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    message: wasUpdate ? "Prediction updated." : "Prediction saved.",
    prediction_id: pred?.id,
    match_id,
    updated_at: upsertPayload.updated_at,
    was_update: wasUpdate,
  });
}
