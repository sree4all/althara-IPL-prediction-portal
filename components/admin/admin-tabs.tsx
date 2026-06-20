"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { AdminConfigForm } from "@/components/admin/admin-config-form";
import { MatchResultPanel, type AdminMatchRow } from "@/components/admin/match-result-panel";
import { PointsMaintenancePanel } from "@/components/admin/points-maintenance-panel";
import { StageScoringPanel } from "@/components/admin/stage-scoring-panel";
import type { BonusPrompt } from "@/lib/types/database";

const TABS = [
  { id: "matches", label: "Match Predictions" },
  { id: "settings", label: "Settings" },
  { id: "bonus", label: "Match Bonus" },
  { id: "scoring", label: "Scoring Configuration" },
] as const;

type TabId = (typeof TABS)[number]["id"];

type Props = {
  tournamentConfig: {
    answer_lock_utc: string | null;
    maintenance_mode: boolean;
    maintenance_banner_text: string;
  };
  bonusPrompts: BonusPrompt[];
  matches: AdminMatchRow[];
};

export function AdminTabs({ tournamentConfig, bonusPrompts, matches }: Props) {
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

      {tab === "matches" ? <MatchResultPanel matches={matches} /> : null}

      {tab === "settings" ? (
        <AdminConfigForm
          initial={{
            ...tournamentConfig,
            bonus_prompts: bonusPrompts,
            matches,
            settingsOnly: true,
          }}
        />
      ) : null}

      {tab === "bonus" ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Per-match bonus questions only. This season uses{" "}
            <code className="text-xs">m31_bonus_qn</code> on Match 31 — add or edit it below.
          </p>
          <AdminConfigForm
            initial={{
              ...tournamentConfig,
              bonus_prompts: bonusPrompts,
              matches,
              bonusOnly: true,
            }}
          />
        </div>
      ) : null}

      {tab === "scoring" ? (
        <div className="space-y-4">
          <StageScoringPanel />
          <PointsMaintenancePanel />
          <p className="text-xs text-muted-foreground">
            <a href="/admin/player-audit" className="underline underline-offset-2">
              Player audit
            </a>{" "}
            — search any participant&apos;s predictions and ledger breakdown.
          </p>
        </div>
      ) : null}
    </div>
  );
}
