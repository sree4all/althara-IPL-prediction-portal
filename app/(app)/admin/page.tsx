import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getProfileForUser } from "@/lib/data/profile";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { PageHeader } from "@/components/layout/page-header";
import { DEFAULT_MAINTENANCE_BANNER_TEXT, fetchTournamentConfig2026 } from "@/lib/data/tournament-config";
import { dedupeMatchesByFixtureNumber } from "@/lib/matches/dedupe-by-match-number";

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
    .select("id, season_year, scope, match_id, prompt_key, prompt_text, is_active, display_order, input_type")
    .eq("season_year", 2026)
    .eq("scope", "match")
    .order("display_order", { ascending: true });
  const { data: adminMatches } = await supabase
    .from("matches")
    .select(
      "id, external_key, home_team, away_team, match_time_utc, status, winner, bonus_result, scored_at, tournament_stage",
    )
    .order("match_time_utc", { ascending: true });

  return (
    <div className="space-y-6">
      <PageHeader title="Admin" />
      <AdminTabs
        tournamentConfig={{
          answer_lock_utc: cfg?.answer_lock_utc ?? null,
          maintenance_mode: Boolean(cfg?.maintenance_mode),
          maintenance_banner_text: cfg?.maintenance_banner_text ?? DEFAULT_MAINTENANCE_BANNER_TEXT,
        }}
        bonusPrompts={bonus ?? []}
        matches={dedupeMatchesByFixtureNumber(adminMatches ?? [])}
      />
    </div>
  );
}
