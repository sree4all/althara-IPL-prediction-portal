import type { SupabaseClient } from "@supabase/supabase-js";
import type { TournamentStageSlug } from "@/lib/fifa/stages";

export type StageScoringRow = {
  season_year: number;
  stage_slug: TournamentStageSlug;
  correct_points: number;
  incorrect_points: number;
};

export async function loadStageScoringMap(
  supabase: SupabaseClient,
  seasonYear: number,
): Promise<Map<TournamentStageSlug, StageScoringRow>> {
  const { data, error } = await supabase
    .from("stage_scoring_config")
    .select("season_year, stage_slug, correct_points, incorrect_points")
    .eq("season_year", seasonYear);
  if (error || !data?.length) {
    return new Map();
  }
  const m = new Map<TournamentStageSlug, StageScoringRow>();
  for (const row of data) {
    const slug = row.stage_slug as TournamentStageSlug;
    m.set(slug, {
      season_year: seasonYear,
      stage_slug: slug,
      correct_points: Number(row.correct_points ?? 0),
      incorrect_points: Number(row.incorrect_points ?? 0),
    });
  }
  return m;
}

export function winnerPointsDelta(
  predicted: string,
  actual: string,
  stage: StageScoringRow,
): number {
  const correct = predicted.trim() === actual.trim();
  return correct ? stage.correct_points : stage.incorrect_points;
}
