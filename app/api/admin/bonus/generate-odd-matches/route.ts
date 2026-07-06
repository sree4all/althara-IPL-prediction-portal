import { NextResponse } from "next/server";
import { generateMatchBonus } from "@/lib/ai/generate-match-bonus";
import { selectOddMatchBonusCandidates } from "@/lib/fifa/odd-match-bonus-candidates";
import { resolveOddBonusCutoff } from "@/lib/fifa/odd-match-bonus-cutoff";
import {
  formatOddBonusNoMatchesMessage,
  summarizeOddBonusSkips,
} from "@/lib/fifa/odd-match-bonus-diagnostics";
import { requireAdminOrResponse } from "@/lib/auth/require-admin";
import { matchSeasonYearOrNullFilter } from "@/lib/fifa/match-season-filter";

const SEASON_YEAR = 2026;

export async function POST(request: Request) {
  const { supabase, denied } = await requireAdminOrResponse();
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as
    | { season_year?: number; dry_run?: boolean; limit?: number }
    | null;

  const seasonYear = body?.season_year ?? SEASON_YEAR;
  const dryRun = Boolean(body?.dry_run);
  const limit = Math.min(Math.max(body?.limit ?? 5, 1), 20);

  const cutoff = resolveOddBonusCutoff(seasonYear);

  const { data: matches, error: mErr } = await supabase
    .from("matches")
    .select("id, match_number, home_team, away_team, tournament_stage, match_time_utc, status")
    .or(matchSeasonYearOrNullFilter(seasonYear))
    .order("match_number", { ascending: true });

  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

  const { data: existingPrompts } = await supabase
    .from("bonus_prompts")
    .select("match_id")
    .eq("season_year", seasonYear)
    .eq("scope", "match")
    .eq("is_active", true);

  const hasBonus = new Set((existingPrompts ?? []).map((p) => p.match_id as string));

  const candidates = selectOddMatchBonusCandidates(matches ?? [], {
    cutoff,
    hasBonusMatchIds: hasBonus,
  });

  if (candidates.length === 0) {
    const skipped = summarizeOddBonusSkips(matches ?? [], {
      cutoff,
      hasBonusMatchIds: hasBonus,
    });
    return NextResponse.json(
      {
        error: "NO_MATCHES",
        message: formatOddBonusNoMatchesMessage(cutoff, skipped),
        cutoff,
      },
      { status: 400 },
    );
  }

  const created: unknown[] = [];
  for (const m of candidates.slice(0, limit)) {
    const matchNumber = m.match_number as number;
    const draft = await generateMatchBonus({
      match_number: matchNumber,
      home_team: m.home_team as string,
      away_team: m.away_team as string,
      tournament_stage: (m.tournament_stage as string) ?? "group",
      match_time_utc: m.match_time_utc,
    });

    if (dryRun) {
      created.push({ match_number: matchNumber, draft });
      continue;
    }

    const promptKey = `ai_m${matchNumber}_${Date.now()}`;
    const { data: prompt, error: pErr } = await supabase
      .from("bonus_prompts")
      .insert({
        season_year: seasonYear,
        scope: "match",
        match_id: m.id,
        prompt_key: promptKey,
        prompt_text: draft.prompt_text,
        is_active: true,
        display_order: 0,
        input_type: "single_choice",
        source: "ai_generated",
        correct_points: 3,
        incorrect_points: 0,
      })
      .select("id")
      .single();

    if (pErr || !prompt) {
      return NextResponse.json({ error: pErr?.message ?? "insert failed" }, { status: 500 });
    }

    const optionRows = draft.options.map((o, i) => ({
      prompt_id: prompt.id,
      label: o.label,
      value: o.value,
      sort_order: i,
    }));
    const { error: oErr } = await supabase.from("bonus_prompt_options").insert(optionRows);
    if (oErr) return NextResponse.json({ error: oErr.message }, { status: 500 });

    created.push({
      match_number: matchNumber,
      prompt_id: prompt.id,
      prompt_text: draft.prompt_text,
    });
  }

  return NextResponse.json({ ok: true, dry_run: dryRun, cutoff, created });
}
