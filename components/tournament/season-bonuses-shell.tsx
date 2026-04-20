"use client";

import { useEffect, useState } from "react";
import { TournamentQuestionsForm } from "@/components/matches/tournament-questions-form";
import { TournamentBonusPromptsForm } from "@/components/matches/tournament-bonus-prompts-form";
import { formatIstDateTime } from "@/lib/utils/time-format";

export function SeasonBonusesShell() {
  const [tabVisible, setTabVisible] = useState<boolean | null>(null);
  const [unlockUtc, setUnlockUtc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/tournament/questions");
      if (!res.ok || cancelled) return;
      const data = await res.json();
      if (cancelled) return;
      setTabVisible(data.season_bonuses_tab_visible !== false);
      setUnlockUtc(data.season_bonuses_unlock_utc ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (tabVisible === null) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (!tabVisible) {
    return (
      <div className="rounded-md border border-border bg-muted/30 p-6 text-center">
        <p className="text-sm font-medium">Mega Bonus is not available yet</p>
        <p className="mt-2 text-xs text-muted-foreground">
          All Mega Bonus questions are hidden until an admin reveals this tab for everyone at once.
          {unlockUtc ? (
            <>
              {" "}
              Scheduled unlock (IST): {formatIstDateTime(unlockUtc)}
            </>
          ) : null}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TournamentQuestionsForm standalone />
      <TournamentBonusPromptsForm />
    </div>
  );
}
