"use client";

import { useState } from "react";
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
  onSave,
}: {
  lock: string | null;
  seasonBonusesVisibleAfterUtc: string | null;
  seasonBonusesRevealedByAdmin: boolean;
  onSave: (patch: {
    answer_lock_utc: string | null;
    season_bonuses_visible_after_utc: string | null;
    season_bonuses_revealed_by_admin: boolean;
  }) => Promise<void>;
}) {
  const [lockVal, setLockVal] = useState(lock ?? "");
  const [tabAfter, setTabAfter] = useState(isoToDatetimeLocalValue(seasonBonusesVisibleAfterUtc));
  const [tabRevealed, setTabRevealed] = useState(seasonBonusesRevealedByAdmin);

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
          })
        }
      >
        Save tournament settings
      </Button>
    </div>
  );
}
