"use client";

import { useState } from "react";
import { toast } from "sonner";
import { TournamentConfigPanel } from "@/components/admin/tournament-config-panel";
import { BonusPromptsPanel } from "@/components/admin/bonus-prompts-panel";

type AdminMatch = {
  id: string;
  external_key: string | null;
  home_team: string;
  away_team: string;
  match_time_utc: string;
  status: string;
};

type AdminConfig = {
  answer_lock_utc: string | null;
  season_bonuses_visible_after_utc: string | null;
  season_bonuses_revealed_by_admin: boolean;
  maintenance_mode: boolean;
  maintenance_banner_text: string;
  mega_bonus_all_answers_visible: boolean;
  bonus_prompts: {
    id: string;
    scope: string;
    match_id: string | null;
    prompt_key: string;
    prompt_text: string;
    is_active: boolean;
    display_order: number;
    input_type?: string;
    options?: { label: string; value: string; sort_order: number }[];
  }[];
  matches: AdminMatch[];
};

export function AdminConfigForm({ initial }: { initial: AdminConfig }) {
  const [cfg, setCfg] = useState(initial);

  async function saveTournamentSettings(patch: {
    answer_lock_utc: string | null;
    season_bonuses_visible_after_utc: string | null;
    season_bonuses_revealed_by_admin: boolean;
    maintenance_mode: boolean;
    maintenance_banner_text: string;
    mega_bonus_all_answers_visible: boolean;
  }) {
    const res = await fetch("/api/admin/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      message?: string;
      error?: string;
    };
    if (res.ok) {
      setCfg((prev) => ({
        ...prev,
        answer_lock_utc: patch.answer_lock_utc,
        season_bonuses_visible_after_utc: patch.season_bonuses_visible_after_utc,
        season_bonuses_revealed_by_admin: patch.season_bonuses_revealed_by_admin,
        maintenance_mode: patch.maintenance_mode,
        maintenance_banner_text: patch.maintenance_banner_text,
        mega_bonus_all_answers_visible: patch.mega_bonus_all_answers_visible,
      }));
      toast.success(data.message ?? "Tournament settings saved.");
    } else {
      toast.error(data.error ?? "Could not save tournament settings.");
    }
  }

  return (
    <div className="space-y-4">
      <TournamentConfigPanel
        lock={cfg.answer_lock_utc}
        seasonBonusesVisibleAfterUtc={cfg.season_bonuses_visible_after_utc}
        seasonBonusesRevealedByAdmin={cfg.season_bonuses_revealed_by_admin}
        maintenanceMode={cfg.maintenance_mode}
        maintenanceBannerText={cfg.maintenance_banner_text}
        megaBonusAllAnswersVisible={cfg.mega_bonus_all_answers_visible}
        onSave={saveTournamentSettings}
      />
      <BonusPromptsPanel initialPrompts={cfg.bonus_prompts} matches={cfg.matches} />
    </div>
  );
}

