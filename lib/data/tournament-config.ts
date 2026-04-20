import type { SupabaseClient } from "@supabase/supabase-js";

export const DEFAULT_MAINTENANCE_BANNER_TEXT = "അടിമ പണിയിലാണ്";

const SELECT_BASE =
  "id, season_year, answer_lock_utc, season_bonuses_visible_after_utc, season_bonuses_revealed_by_admin";
const SELECT_FULL = `${SELECT_BASE}, maintenance_mode, maintenance_banner_text`;

/** PostgREST / Postgres when `0022_tournament_maintenance_mode` is not applied yet. */
export function isMissingMaintenanceColumnsError(err: { message?: string; code?: string } | null): boolean {
  if (!err?.message) return false;
  const m = err.message;
  return (
    m.includes("maintenance_mode") ||
    m.includes("maintenance_banner_text") ||
    m.includes("42703") ||
    m.includes("does not exist")
  );
}

export type TournamentConfigRow = {
  id?: string;
  season_year: number;
  answer_lock_utc: string | null;
  season_bonuses_visible_after_utc: string | null;
  season_bonuses_revealed_by_admin: boolean;
  maintenance_mode: boolean;
  maintenance_banner_text: string;
};

export async function fetchTournamentConfig2026(
  supabase: SupabaseClient,
): Promise<{ data: TournamentConfigRow | null; error: { message: string } | null }> {
  const full = await supabase.from("tournament_config").select(SELECT_FULL).eq("season_year", 2026).maybeSingle();
  if (!full.error) {
    const d = full.data;
    if (!d) return { data: null, error: null };
    return {
      data: {
        id: d.id as string | undefined,
        season_year: Number(d.season_year ?? 2026),
        answer_lock_utc: (d.answer_lock_utc as string | null) ?? null,
        season_bonuses_visible_after_utc: (d.season_bonuses_visible_after_utc as string | null) ?? null,
        season_bonuses_revealed_by_admin: Boolean(d.season_bonuses_revealed_by_admin),
        maintenance_mode: Boolean(d.maintenance_mode),
        maintenance_banner_text: (d.maintenance_banner_text as string | null) ?? DEFAULT_MAINTENANCE_BANNER_TEXT,
      },
      error: null,
    };
  }
  if (!isMissingMaintenanceColumnsError(full.error)) {
    return { data: null, error: { message: full.error.message } };
  }
  const basic = await supabase.from("tournament_config").select(SELECT_BASE).eq("season_year", 2026).maybeSingle();
  if (basic.error) {
    return { data: null, error: { message: basic.error.message } };
  }
  const d = basic.data;
  if (!d) return { data: null, error: null };
  return {
    data: {
      id: d.id as string | undefined,
      season_year: Number(d.season_year ?? 2026),
      answer_lock_utc: (d.answer_lock_utc as string | null) ?? null,
      season_bonuses_visible_after_utc: (d.season_bonuses_visible_after_utc as string | null) ?? null,
      season_bonuses_revealed_by_admin: Boolean(d.season_bonuses_revealed_by_admin),
      maintenance_mode: false,
      maintenance_banner_text: DEFAULT_MAINTENANCE_BANNER_TEXT,
    },
    error: null,
  };
}

export async function getMaintenanceGate(
  supabase: SupabaseClient,
): Promise<{ on: boolean; text: string }> {
  const r = await supabase
    .from("tournament_config")
    .select("maintenance_mode, maintenance_banner_text")
    .eq("season_year", 2026)
    .maybeSingle();
  if (!r.error && r.data) {
    return {
      on: Boolean(r.data.maintenance_mode),
      text: (r.data.maintenance_banner_text as string | null) || DEFAULT_MAINTENANCE_BANNER_TEXT,
    };
  }
  if (r.error && isMissingMaintenanceColumnsError(r.error)) {
    return { on: false, text: DEFAULT_MAINTENANCE_BANNER_TEXT };
  }
  if (r.error) {
    return { on: false, text: DEFAULT_MAINTENANCE_BANNER_TEXT };
  }
  return { on: false, text: DEFAULT_MAINTENANCE_BANNER_TEXT };
}
