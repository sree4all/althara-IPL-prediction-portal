"use client";

import { useEffect, useState } from "react";
import { TournamentQuestionsForm } from "@/components/matches/tournament-questions-form";
import { TournamentBonusPromptsForm } from "@/components/matches/tournament-bonus-prompts-form";
import { formatIstDateTime } from "@/lib/utils/time-format";

export function SeasonBonusesShell() {
  const [tabVisible, setTabVisible] = useState<boolean | null>(null);
  const [unlockUtc, setUnlockUtc] = useState<string | null>(null);
  const [answerLockUtc, setAnswerLockUtc] = useState<string | null>(null);
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/tournament/questions");
      if (!res.ok || cancelled) return;
      const data = await res.json();
      if (cancelled) return;
      setTabVisible(data.season_bonuses_tab_visible !== false);
      setUnlockUtc(data.season_bonuses_unlock_utc ?? null);
      setAnswerLockUtc(data.answer_lock_utc ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (tabVisible === null) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (!tabVisible) {
    return (
      <div className="space-y-3">
        <div className="rounded-md border border-red-300 bg-red-50/40 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          <p className="font-bold">Current time (IST): {formatIstDateTime(now)}</p>
          {answerLockUtc ? (
            <p className="font-bold">Tournament answer lock (IST): {formatIstDateTime(answerLockUtc)}</p>
          ) : null}
        </div>
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-red-300 bg-red-50/40 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
        <p className="font-bold">Current time (IST): {formatIstDateTime(now)}</p>
        {answerLockUtc ? (
          <p className="font-bold">Tournament answer lock (IST): {formatIstDateTime(answerLockUtc)}</p>
        ) : null}
      </div>
      <TournamentQuestionsForm standalone />
      <TournamentBonusPromptsForm />
    </div>
  );
}
