import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SEASON_YEAR = 2026;

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get("match_id");
  if (!matchId) return NextResponse.json({ error: "VALIDATION" }, { status: 400 });

  const { data: match, error: mErr } = await supabase
    .from("matches")
    .select("id, external_key, home_team, away_team, match_time_utc, status")
    .eq("id", matchId)
    .maybeSingle();
  if (mErr || !match) return NextResponse.json({ error: "MATCH_NOT_FOUND" }, { status: 404 });

  const ext = (match.external_key as string | null)?.trim();
  const label = ext
    ? `${ext} — ${match.home_team} vs ${match.away_team}`
    : `${match.home_team} vs ${match.away_team}`;

  const { data: preds, error: pErr } = await supabase
    .from("predictions")
    .select("user_id, predicted_winner, bonus_pick")
    .eq("match_id", matchId);
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  const userIds = [...new Set((preds ?? []).map((p) => p.user_id as string))];
  let nameByUser = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", userIds);
    nameByUser = new Map((profiles ?? []).map((r) => [r.id as string, r.display_name as string]));
  }

  const { data: bonusRows } = await supabase
    .from("prediction_bonus_answers")
    .select("user_id, prompt_id, answer_text")
    .eq("match_id", matchId);

  const promptIds = [...new Set((bonusRows ?? []).map((b) => b.prompt_id as string))];
  let promptText = new Map<string, string>();
  if (promptIds.length > 0) {
    const { data: prompts } = await supabase
      .from("bonus_prompts")
      .select("id, prompt_text")
      .in("id", promptIds)
      .eq("season_year", SEASON_YEAR);
    promptText = new Map((prompts ?? []).map((p) => [p.id as string, p.prompt_text as string]));
  }

  const bonusByUser = new Map<string, { prompt_text: string; answer_text: string }[]>();
  for (const row of bonusRows ?? []) {
    const uid = row.user_id as string;
    const pid = row.prompt_id as string;
    const text = promptText.get(pid) ?? "Bonus";
    if (!bonusByUser.has(uid)) bonusByUser.set(uid, []);
    bonusByUser.get(uid)!.push({
      prompt_text: text,
      answer_text: (row.answer_text as string) ?? "",
    });
  }

  const entries = (preds ?? []).map((p) => {
    const uid = p.user_id as string;
    return {
      user_id: uid,
      display_name: nameByUser.get(uid) ?? "Player",
      predicted_winner: p.predicted_winner as string,
      bonus_pick: (p.bonus_pick as string | null)?.trim() || null,
      bonus_answers: bonusByUser.get(uid) ?? [],
    };
  });

  entries.sort((a, b) => a.display_name.localeCompare(b.display_name));

  return NextResponse.json({
    season_year: SEASON_YEAR,
    match: {
      id: match.id,
      label,
      external_key: match.external_key,
      home_team: match.home_team,
      away_team: match.away_team,
      match_time_utc: match.match_time_utc,
      status: match.status,
    },
    entries,
  });
}
