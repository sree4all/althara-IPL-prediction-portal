"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { AdminConfigForm } from "@/components/admin/admin-config-form";
import { MatchResultPanel, type AdminMatchRow } from "@/components/admin/match-result-panel";
import { StageScoringPanel } from "@/components/admin/stage-scoring-panel";
import { TournamentScoringPanel } from "@/components/admin/tournament-scoring-panel";
import type { BonusPrompt } from "@/lib/types/database";

const TABS = [
  { id: "matches", label: "Match Predictions" },
  { id: "tournament", label: "Tournament Settings" },
  { id: "bonus", label: "Bonus Points Settings" },
  { id: "scoring", label: "Scoring Configuration" },
] as const;

type TabId = (typeof TABS)[number]["id"];

type Props = {
  tournamentConfig: {
    answer_lock_utc: string | null;
    season_bonuses_visible_after_utc: string | null;
    season_bonuses_revealed_by_admin: boolean;
    maintenance_mode: boolean;
    maintenance_banner_text: string;
    mega_bonus_all_answers_visible: boolean;
  };
  bonusPrompts: BonusPrompt[];
  matches: AdminMatchRow[];
  tournamentQuestions: {
    id: string;
    slot_no: number;
    question_text: string;
    correct_answer?: string | null;
    scored_at?: string | null;
    visible_after_utc?: string | null;
    revealed_by_admin?: boolean;
  }[];
  optionsByQuestion: Record<string, { label: string; value: string; sort_order: number }[]>;
};

export function AdminTabs({
  tournamentConfig,
  bonusPrompts,
  matches,
  tournamentQuestions,
  optionsByQuestion,
}: Props) {
  const [tab, setTab] = useState<TabId>("matches");

  return (
    <div className="space-y-4">
      <nav
        className="flex flex-wrap gap-1 border-b border-white/10 pb-2"
        aria-label="Admin sections"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition-all",
              tab === t.id
                ? "wc-nav-active"
                : "text-white/60 hover:bg-white/10 hover:text-white",
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "matches" ? (
        <MatchResultPanel matches={matches} />
      ) : null}

      {tab === "tournament" ? (
        <AdminConfigForm
          initial={{
            ...tournamentConfig,
            bonus_prompts: bonusPrompts,
            matches,
            tournamentOnly: true,
          }}
        />
      ) : null}

      {tab === "bonus" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              Match bonus prompts and season-long tournament questions.
            </p>
            <Link
              href="/admin/mega-bonus-answers"
              className="text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Mega Bonus answers (all players)
            </Link>
          </div>
          <AdminConfigForm
            initial={{
              ...tournamentConfig,
              bonus_prompts: bonusPrompts,
              matches,
              bonusOnly: true,
            }}
          />
          <TournamentScoringPanel
            questions={tournamentQuestions}
            optionsByQuestion={optionsByQuestion}
          />
        </div>
      ) : null}

      {tab === "scoring" ? <StageScoringPanel /> : null}
    </div>
  );
}
