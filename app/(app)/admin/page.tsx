import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getProfileForUser } from "@/lib/data/profile";
import { AdminConfigForm } from "@/components/admin/admin-config-form";
import { ScoringConfigSection } from "@/components/admin/scoring-config-section";
import { MatchResultPanel } from "@/components/admin/match-result-panel";
import { TournamentScoringPanel } from "@/components/admin/tournament-scoring-panel";
import { DEFAULT_MAINTENANCE_BANNER_TEXT, fetchTournamentConfig2026 } from "@/lib/data/tournament-config";

export default async function AdminPage() {
  const { supabase, user } = await requireUser();
  const profile = await getProfileForUser(supabase, user.id);
  if ((profile?.role ?? "user") !== "admin") {
    redirect("/matches");
  }

  const { data: cfg, error: cfgErr } = await fetchTournamentConfig2026(supabase);
  if (cfgErr) {
    throw new Error(cfgErr.message);
  }
  const { data: bonus } = await supabase
    .from("bonus_prompts")
    .select("id, scope, match_id, prompt_key, prompt_text, is_active, display_order, input_type")
    .eq("season_year", 2026)
    .order("display_order", { ascending: true });
  const { data: adminMatches } = await supabase
    .from("matches")
    .select(
      "id, external_key, home_team, away_team, match_time_utc, status, winner, bonus_result, scored_at",
    )
    .order("match_time_utc", { ascending: true });
  const { data: tournamentQuestions } = await supabase
    .from("tournament_questions")
    .select("id, slot_no, question_text, correct_answer, scored_at, visible_after_utc, revealed_by_admin")
    .eq("season_year", 2026)
    .order("slot_no", { ascending: true });

  const tqIds = (tournamentQuestions ?? []).map((q) => q.id as string);
  const { data: tQuestionOpts } =
    tqIds.length > 0
      ? await supabase
          .from("tournament_question_options")
          .select("id, question_id, label, value, sort_order")
          .in("question_id", tqIds)
          .order("sort_order", { ascending: true })
      : { data: [] };

  const optionsByQuestion: Record<string, { label: string; value: string; sort_order: number }[]> = {};
  for (const o of tQuestionOpts ?? []) {
    const qid = o.question_id as string;
    if (!optionsByQuestion[qid]) optionsByQuestion[qid] = [];
    optionsByQuestion[qid].push({
      label: o.label as string,
      value: o.value as string,
      sort_order: Number(o.sort_order ?? 0),
    });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
      <AdminConfigForm
        initial={{
          answer_lock_utc: cfg?.answer_lock_utc ?? null,
          season_bonuses_visible_after_utc: cfg?.season_bonuses_visible_after_utc ?? null,
          season_bonuses_revealed_by_admin: Boolean(cfg?.season_bonuses_revealed_by_admin),
          maintenance_mode: Boolean(cfg?.maintenance_mode),
          maintenance_banner_text: cfg?.maintenance_banner_text ?? DEFAULT_MAINTENANCE_BANNER_TEXT,
          bonus_prompts: bonus ?? [],
          matches: adminMatches ?? [],
        }}
      />
      <ScoringConfigSection />
      <MatchResultPanel matches={adminMatches ?? []} />
      <TournamentScoringPanel
        questions={tournamentQuestions ?? []}
        optionsByQuestion={optionsByQuestion}
      />
    </div>
  );
}

