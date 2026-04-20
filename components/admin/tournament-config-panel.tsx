"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

function isoToDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TournamentConfigPanel({
  lock,
  seasonBonusesVisibleAfterUtc,
  seasonBonusesRevealedByAdmin,
  maintenanceMode,
  maintenanceBannerText,
  megaBonusAllAnswersVisible,
  onSave,
}: {
  lock: string | null;
  seasonBonusesVisibleAfterUtc: string | null;
  seasonBonusesRevealedByAdmin: boolean;
  maintenanceMode: boolean;
  maintenanceBannerText: string;
  megaBonusAllAnswersVisible: boolean;
  onSave: (patch: {
    answer_lock_utc: string | null;
    season_bonuses_visible_after_utc: string | null;
    season_bonuses_revealed_by_admin: boolean;
    maintenance_mode: boolean;
    maintenance_banner_text: string;
    mega_bonus_all_answers_visible: boolean;
  }) => Promise<void>;
}) {
  const [lockVal, setLockVal] = useState(lock ?? "");
  const [tabAfter, setTabAfter] = useState(isoToDatetimeLocalValue(seasonBonusesVisibleAfterUtc));
  const [tabRevealed, setTabRevealed] = useState(seasonBonusesRevealedByAdmin);
  const [isMaintenanceOn, setIsMaintenanceOn] = useState(maintenanceMode);
  const [maintenanceText, setMaintenanceText] = useState(
    maintenanceBannerText || "അടിമ പണിയിലാണ്",
  );
  const [allAnswersPublic, setAllAnswersPublic] = useState(megaBonusAllAnswersVisible);

  useEffect(() => {
    setAllAnswersPublic(megaBonusAllAnswersVisible);
  }, [megaBonusAllAnswersVisible]);

  return (
    <div className="rounded-md border border-border p-3 space-y-4">
      <div>
        <p className="text-sm font-semibold">Tournament answer lock (IST)</p>
        <p className="mt-1 text-xs text-muted-foreground">
          After this time, players cannot edit season-long bonus answers.
        </p>
        <input
          className="mt-2 w-full rounded-md border border-input px-2 py-1 text-sm"
          value={lockVal}
          onChange={(e) => setLockVal(e.target.value)}
          placeholder="ISO timestamp or empty"
        />
      </div>

      <div className="border-t border-border pt-3">
        <p className="text-sm font-semibold">Maintenance mode</p>
        <p className="mt-1 text-xs text-muted-foreground">
          When enabled, non-admin users will only see a full-page banner.
        </p>
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isMaintenanceOn}
            onChange={(e) => setIsMaintenanceOn(e.target.checked)}
          />
          Enable maintenance banner for non-admin users
        </label>
        <label className="mt-2 block text-xs text-muted-foreground">
          Banner text
          <input
            className="mt-1 w-full rounded-md border border-input px-2 py-1 text-sm"
            value={maintenanceText}
            onChange={(e) => setMaintenanceText(e.target.value)}
            placeholder="അടിമ പണിയിലാണ്"
          />
        </label>
      </div>

      <div className="border-t border-border pt-3">
        <p className="text-sm font-semibold">Mega Bonus tab (all questions together)</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Until the tab is revealed, players do not see any Mega Bonus questions or season-wide bonus
          prompts. Check &quot;Reveal tab&quot; or set a date/time (IST) when the tab should open.
        </p>
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={tabRevealed}
            onChange={(e) => setTabRevealed(e.target.checked)}
          />
          Reveal Mega Bonus tab to players now
        </label>
        <label className="mt-2 block text-xs text-muted-foreground">
          Or reveal automatically after (IST time below)
          <input
            type="datetime-local"
            className="mt-1 w-full rounded-md border border-input px-2 py-1 text-sm"
            value={tabAfter}
            onChange={(e) => setTabAfter(e.target.value)}
          />
        </label>
        <label className="mt-3 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={allAnswersPublic}
            onChange={(e) => setAllAnswersPublic(e.target.checked)}
          />
          <span>
            Let everyone see the &quot;All player answers&quot; grid on Mega Bonus (slot picks). Admins
            always see it; others only when this is on. The same setting appears on the Mega Bonus page
            for everyone (only admins can change it there).
          </span>
        </label>
      </div>

      <Button
        className="mt-1"
        size="sm"
        onClick={() =>
          onSave({
            answer_lock_utc: lockVal.trim() || null,
            season_bonuses_visible_after_utc: tabAfter
              ? new Date(tabAfter).toISOString()
              : null,
            season_bonuses_revealed_by_admin: tabRevealed,
            maintenance_mode: isMaintenanceOn,
            maintenance_banner_text: maintenanceText.trim() || "അടിമ പണിയിലാണ്",
            mega_bonus_all_answers_visible: allAnswersPublic,
          })
        }
      >
        Save tournament settings
      </Button>
    </div>
  );
}
