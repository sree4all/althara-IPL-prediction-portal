"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  istDatetimeLocalToUtcIso,
  utcIsoToIstDatetimeLocalValue,
} from "@/lib/utils/time-format";

export function TournamentConfigPanel({
  lock,
  maintenanceMode,
  maintenanceBannerText,
  onSave,
}: {
  lock: string | null;
  maintenanceMode: boolean;
  maintenanceBannerText: string;
  onSave: (patch: {
    answer_lock_utc: string | null;
    maintenance_mode: boolean;
    maintenance_banner_text: string;
  }) => Promise<void>;
}) {
  const [lockVal, setLockVal] = useState(utcIsoToIstDatetimeLocalValue(lock));
  const [isMaintenanceOn, setIsMaintenanceOn] = useState(maintenanceMode);
  const [maintenanceText, setMaintenanceText] = useState(
    maintenanceBannerText || "അടിമ പണിയിലാണ്",
  );

  return (
    <div className="space-y-4 rounded-md border border-border p-3">
      <div>
        <p className="text-sm font-semibold">Prediction lock (IST)</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Optional season-wide lock time. Match predictions still lock at each fixture kickoff.
        </p>
        <input
          type="datetime-local"
          className="mt-2 w-full rounded-md border border-input px-2 py-1 text-sm"
          value={lockVal}
          onChange={(e) => setLockVal(e.target.value)}
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

      <Button
        className="mt-1"
        size="sm"
        onClick={() =>
          onSave({
            answer_lock_utc: istDatetimeLocalToUtcIso(lockVal),
            maintenance_mode: isMaintenanceOn,
            maintenance_banner_text: maintenanceText.trim() || "അടിമ പണിയിലാണ്",
          })
        }
      >
        Save settings
      </Button>
    </div>
  );
}
