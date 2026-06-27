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
  maintenance_mode: boolean;
  maintenance_banner_text: string;
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
  settingsOnly?: boolean;
  bonusOnly?: boolean;
};

export function AdminConfigForm({ initial }: { initial: AdminConfig }) {
  const [cfg, setCfg] = useState(initial);

  async function saveSettings(patch: {
    answer_lock_utc: string | null;
    maintenance_mode: boolean;
    maintenance_banner_text: string;
  }) {
    const res = await fetch("/api/admin/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...patch,
        season_bonuses_revealed_by_admin: false,
        season_bonuses_visible_after_utc: null,
        mega_bonus_all_answers_visible: false,
      }),
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
        maintenance_mode: patch.maintenance_mode,
        maintenance_banner_text: patch.maintenance_banner_text,
      }));
      toast.success(data.message ?? "Settings saved.");
    } else {
      toast.error(data.error ?? "Could not save settings.");
    }
  }

  const showSettings = !initial.bonusOnly;
  const showBonus = !initial.settingsOnly;

  return (
    <div className="space-y-4">
      {showSettings ? (
        <TournamentConfigPanel
          lock={cfg.answer_lock_utc}
          maintenanceMode={cfg.maintenance_mode}
          maintenanceBannerText={cfg.maintenance_banner_text}
          onSave={saveSettings}
        />
      ) : null}
      {showBonus ? (
        <BonusPromptsPanel initialPrompts={cfg.bonus_prompts} matches={cfg.matches} />
      ) : null}
    </div>
  );
}
