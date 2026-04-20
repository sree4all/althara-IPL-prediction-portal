import type { SupabaseClient } from "@supabase/supabase-js";

export const DEFAULT_MAINTENANCE_BANNER_TEXT = "അടിമ പണിയിലാണ്";

const SELECT_BASE =
  "id, season_year, answer_lock_utc, season_bonuses_visible_after_utc, season_bonuses_revealed_by_admin";
const SELECT_WITH_MAINT = `${SELECT_BASE}, maintenance_mode, maintenance_banner_text`;
const SELECT_FULL = `${SELECT_WITH_MAINT}, mega_bonus_all_answers_visible`;

/** Upsert/select failed because maintenance columns from migration 0022 are missing. */
export function isMissingMaintenanceColumnsError(err: { message?: string; code?: string } | null): boolean {
  if (!err?.message) return false;
  const m = err.message;
  return m.includes("maintenance_mode") || m.includes("maintenance_banner_text");
}

export function isMissingMegaBonusPublicColumnError(err: { message?: string; code?: string } | null): boolean {
  if (!err?.message) return false;
  return err.message.includes("mega_bonus_all_answers_visible");
}

export type TournamentConfigRow = {
  id?: string;
  season_year: number;
  answer_lock_utc: string | null;
  season_bonuses_visible_after_utc: string | null;
  season_bonuses_revealed_by_admin: boolean;
  maintenance_mode: boolean;
  maintenance_banner_text: string;
  mega_bonus_all_answers_visible: boolean;
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
        mega_bonus_all_answers_visible: Boolean(
          (d as { mega_bonus_all_answers_visible?: boolean }).mega_bonus_all_answers_visible,
        ),
      },
      error: null,
    };
  }
  if (isMissingMegaBonusPublicColumnError(full.error)) {
    const midRes = await supabase
      .from("tournament_config")
      .select(SELECT_WITH_MAINT)
      .eq("season_year", 2026)
      .maybeSingle();
    if (!midRes.error && midRes.data) {
      const d = midRes.data;
      return {
        data: {
          id: d.id as string | undefined,
          season_year: Number(d.season_year ?? 2026),
          answer_lock_utc: (d.answer_lock_utc as string | null) ?? null,
          season_bonuses_visible_after_utc: (d.season_bonuses_visible_after_utc as string | null) ?? null,
          season_bonuses_revealed_by_admin: Boolean(d.season_bonuses_revealed_by_admin),
          maintenance_mode: Boolean((d as { maintenance_mode?: boolean }).maintenance_mode),
          maintenance_banner_text:
            (d as { maintenance_banner_text?: string | null }).maintenance_banner_text ??
            DEFAULT_MAINTENANCE_BANNER_TEXT,
          mega_bonus_all_answers_visible: false,
        },
        error: null,
      };
    }
    return {
      data: null,
      error: { message: midRes.error?.message ?? full.error.message },
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
      mega_bonus_all_answers_visible: false,
    },
    error: null,
  };
}

export async function getMaintenanceGate(
  supabase: SupabaseClient,
): Promise<{ on: boolean; text: string }> {
  const { data, error } = await fetchTournamentConfig2026(supabase);
  if (error || !data) {
    return { on: false, text: DEFAULT_MAINTENANCE_BANNER_TEXT };
  }
  return {
    on: data.maintenance_mode,
    text: (data.maintenance_banner_text ?? "").trim() || DEFAULT_MAINTENANCE_BANNER_TEXT,
  };
}
