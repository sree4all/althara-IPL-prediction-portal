"use client";

import { useEffect, useState } from "react";
import { TournamentQuestionsForm } from "@/components/matches/tournament-questions-form";
import { TournamentBonusPromptsForm } from "@/components/matches/tournament-bonus-prompts-form";

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
        <p className="text-sm font-medium">Season bonuses are not available yet</p>
        <p className="mt-2 text-xs text-muted-foreground">
          All season bonus questions are hidden until an admin reveals this tab for everyone at once.
          {unlockUtc ? (
            <>
              {" "}
              Scheduled unlock (UTC): {new Date(unlockUtc).toISOString().replace("T", " ").slice(0, 19)}
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
