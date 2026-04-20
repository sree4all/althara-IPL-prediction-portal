"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { TournamentQuestionsForm } from "@/components/matches/tournament-questions-form";
import { TournamentBonusPromptsForm } from "@/components/matches/tournament-bonus-prompts-form";
import { MegaBonusAnswersOverview } from "@/components/tournament/mega-bonus-answers-overview";
import { formatIstDateTime } from "@/lib/utils/time-format";
import { toast } from "sonner";

export function SeasonBonusesShell() {
  const [tabVisible, setTabVisible] = useState<boolean | null>(null);
  const [unlockUtc, setUnlockUtc] = useState<string | null>(null);
  const [answerLockUtc, setAnswerLockUtc] = useState<string | null>(null);
  const [now, setNow] = useState<Date>(new Date());
  const [isAdmin, setIsAdmin] = useState(false);
  const [megaTab, setMegaTab] = useState<"mine" | "all">("mine");
  const [megaPublic, setMegaPublic] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && !cancelled) {
        const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
        if (!cancelled) setIsAdmin(prof?.role === "admin");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
      setMegaPublic(Boolean(data.mega_bonus_all_answers_visible));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const showAllPlayerTab = isAdmin || megaPublic;

  useEffect(() => {
    if (!showAllPlayerTab && megaTab === "all") {
      setMegaTab("mine");
    }
  }, [showAllPlayerTab, megaTab]);

  async function toggleMegaPublic(next: boolean) {
    if (!isAdmin) return;
    const res = await fetch("/api/admin/tournament/mega-bonus-all-answers-visibility", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mega_bonus_all_answers_visible: next }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error((j as { error?: string }).error ?? "Could not update setting");
      return;
    }
    setMegaPublic(next);
    toast.success(next ? "Everyone can view all Mega Bonus slot answers." : "All-player grid hidden from non-admins.");
  }

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
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted/20 px-3 py-2.5 text-sm">
        <span className="font-medium text-foreground">Show everyone&apos;s Mega Bonus slot answers</span>
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            role="switch"
            aria-checked={megaPublic}
            checked={megaPublic}
            disabled={!isAdmin}
            onChange={(e) => void toggleMegaPublic(e.target.checked)}
            className="h-5 w-9 cursor-pointer rounded-full border border-input accent-primary disabled:cursor-not-allowed disabled:opacity-60"
          />
          <span className="text-muted-foreground">{megaPublic ? "On" : "Off"}</span>
        </label>
        {!isAdmin ? (
          <span className="text-xs text-muted-foreground">Only an admin can change this.</span>
        ) : null}
      </div>
      {showAllPlayerTab ? (
        <div className="flex flex-wrap gap-2 border-b border-border pb-2">
          <button
            type="button"
            onClick={() => setMegaTab("mine")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              megaTab === "mine"
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            My Mega Bonus
          </button>
          <button
            type="button"
            onClick={() => setMegaTab("all")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              megaTab === "all"
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            All player answers
          </button>
        </div>
      ) : null}
      {showAllPlayerTab && megaTab === "all" ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Players with at least one saved slot answer. Open{" "}
            <a className="underline underline-offset-4" href="/admin/mega-bonus-answers">
              full-page grid
            </a>{" "}
            for a wider layout.
          </p>
          <MegaBonusAnswersOverview />
        </div>
      ) : (
        <>
          <TournamentQuestionsForm standalone />
          <TournamentBonusPromptsForm />
        </>
      )}
    </div>
  );
}
