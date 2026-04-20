import type { SupabaseClient } from "@supabase/supabase-js";
import type { TournamentConfig } from "@/lib/types/database";

export async function getSeasonConfig(
  supabase: SupabaseClient,
  seasonYear = 2026,
): Promise<TournamentConfig | null> {
  const fullSel =
    "id, season_year, answer_lock_utc, season_bonuses_visible_after_utc, season_bonuses_revealed_by_admin, mega_bonus_all_answers_visible";
  const baseSel =
    "id, season_year, answer_lock_utc, season_bonuses_visible_after_utc, season_bonuses_revealed_by_admin";

  const { data, error } = await supabase
    .from("tournament_config")
    .select(fullSel)
    .eq("season_year", seasonYear)
    .maybeSingle();

  if (error?.message?.includes("mega_bonus_all_answers_visible")) {
    const { data: d2 } = await supabase
      .from("tournament_config")
      .select(baseSel)
      .eq("season_year", seasonYear)
      .maybeSingle();
    if (!d2) return null;
    return { ...d2, mega_bonus_all_answers_visible: false } as TournamentConfig;
  }
  if (error) return null;
  return data as TournamentConfig | null;
}

export async function getTournamentQuestions(supabase: SupabaseClient, seasonYear = 2026) {
  const { data } = await supabase
    .from("tournament_questions")
    .select(
      "id, season_year, slot_no, question_text, is_active, display_order, visible_after_utc, revealed_by_admin, correct_answer, scored_at",
    )
    .eq("season_year", seasonYear)
    .order("slot_no", { ascending: true });
  return data ?? [];
}

export async function getTournamentQuestionOptionsForQuestions(
  supabase: SupabaseClient,
  questionIds: string[],
) {
  if (questionIds.length === 0) return [];
  const { data } = await supabase
    .from("tournament_question_options")
    .select("id, question_id, label, value, sort_order")
    .in("question_id", questionIds)
    .order("sort_order", { ascending: true });
  return data ?? [];
}

type BonusPromptOptionRow = {
  id: string;
  label: string;
  value: string;
  sort_order: number;
};

type BonusPromptWithNested = {
  id: string;
  scope: string;
  match_id: string | null;
  prompt_key: string;
  prompt_text: string;
  is_active: boolean;
  display_order: number;
  input_type: string | null;
  bonus_prompt_options?: BonusPromptOptionRow[] | null;
};

/** Match card / prediction UX: only prompts tied to this match (not tournament-wide). */
export async function getBonusPromptsForMatch(supabase: SupabaseClient, matchId: string, seasonYear = 2026) {
  const { data, error } = await supabase
    .from("bonus_prompts")
    .select(
      `
      id,
      scope,
      match_id,
      prompt_key,
      prompt_text,
      is_active,
      display_order,
      input_type,
      bonus_prompt_options ( id, label, value, sort_order )
    `,
    )
    .eq("season_year", seasonYear)
    .eq("is_active", true)
    .eq("scope", "match")
    .eq("match_id", matchId)
    .order("display_order", { ascending: true })
    .order("sort_order", { foreignTable: "bonus_prompt_options", ascending: true });

  if (error) {
    console.error("getBonusPromptsForMatch (nested):", error.message);
    return await getBonusPromptsForMatchFallback(supabase, matchId, seasonYear);
  }

  const list = (data ?? []) as BonusPromptWithNested[];
  return list.map((p) => {
    const opts = [...(p.bonus_prompt_options ?? [])].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
    );
    return {
      id: p.id,
      scope: p.scope,
      match_id: p.match_id,
      prompt_key: p.prompt_key,
      prompt_text: p.prompt_text,
      is_active: p.is_active,
      display_order: p.display_order,
      input_type: p.input_type,
      options: opts,
    };
  });
}

/** Two-query load if nested select is unavailable (older PostgREST) or relationship missing. */
async function getBonusPromptsForMatchFallback(
  supabase: SupabaseClient,
  matchId: string,
  seasonYear: number,
) {
  const { data: prompts, error: pErr } = await supabase
    .from("bonus_prompts")
    .select("id, scope, match_id, prompt_key, prompt_text, is_active, display_order, input_type")
    .eq("season_year", seasonYear)
    .eq("is_active", true)
    .eq("scope", "match")
    .eq("match_id", matchId)
    .order("display_order", { ascending: true });
  if (pErr) {
    console.error("getBonusPromptsForMatchFallback prompts:", pErr.message);
    return [];
  }
  const list = prompts ?? [];
  const ids = list.map((p) => p.id as string);
  if (ids.length === 0) return [];
  const { data: opts, error: oErr } = await supabase
    .from("bonus_prompt_options")
    .select("id, prompt_id, label, value, sort_order")
    .in("prompt_id", ids)
    .order("sort_order", { ascending: true });
  if (oErr) {
    console.error("getBonusPromptsForMatchFallback options:", oErr.message);
  }
  const byPrompt = new Map<string, NonNullable<typeof opts>>();
  for (const o of opts ?? []) {
    const pid = o.prompt_id as string;
    if (!byPrompt.has(pid)) byPrompt.set(pid, []);
    byPrompt.get(pid)!.push(o);
  }
  return list.map((p) => ({
    ...p,
    options: byPrompt.get(p.id as string) ?? [],
  }));
}

/** Tournament tab: season-wide bonus prompts (not per-match), with structured options. */
export async function getTournamentBonusPrompts(supabase: SupabaseClient, seasonYear = 2026) {
  const { data: prompts } = await supabase
    .from("bonus_prompts")
    .select("id, scope, match_id, prompt_key, prompt_text, is_active, display_order, input_type")
    .eq("season_year", seasonYear)
    .eq("is_active", true)
    .eq("scope", "tournament")
    .order("display_order", { ascending: true });
  const list = prompts ?? [];
  const ids = list.map((p) => p.id as string);
  if (ids.length === 0) return [];
  const { data: opts } = await supabase
    .from("bonus_prompt_options")
    .select("id, prompt_id, label, value, sort_order")
    .in("prompt_id", ids)
    .order("sort_order", { ascending: true });
  const byPrompt = new Map<string, NonNullable<typeof opts>>();
  for (const o of opts ?? []) {
    const pid = o.prompt_id as string;
    if (!byPrompt.has(pid)) byPrompt.set(pid, []);
    byPrompt.get(pid)!.push(o);
  }
  return list.map((p) => ({
    ...p,
    options: byPrompt.get(p.id as string) ?? [],
  }));
}

