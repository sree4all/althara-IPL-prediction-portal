import type { SupabaseClient } from "@supabase/supabase-js";

export type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string;
  legacy_points: number | null;
  current_points: number;
  rank: number | null;
  role?: string;
  /** false = must finish /login/legacy-alias (claim or skip) before using the app */
  legacy_alias_onboarding_completed?: boolean;
};

export async function getProfileForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, email, display_name, legacy_points, current_points, rank, role, legacy_alias_onboarding_completed",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  return data as ProfileRow;
}
