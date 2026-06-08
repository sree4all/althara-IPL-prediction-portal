"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DRAW_PICK } from "@/lib/fifa/stages";
import {
  toastPredictionError,
  toastPredictionLocked,
  toastPredictionRecorded,
} from "@/lib/toasts/prediction-feedback";
import { BonusPromptsForm } from "@/components/matches/bonus-prompts-form";

type Props = {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  locked: boolean;
  matchLabel: string;
  initialWinner?: string | null;
  teamsPending?: boolean;
};

export function PredictionForm({
  matchId,
  homeTeam,
  awayTeam,
  locked,
  matchLabel,
  initialWinner,
  teamsPending = false,
}: Props) {
  const validInitial =
    initialWinner === homeTeam ||
    initialWinner === awayTeam ||
    initialWinner === DRAW_PICK
      ? initialWinner
      : homeTeam;
  const [winner, setWinner] = useState(validInitial);
  const hasExistingPrediction =
    initialWinner === homeTeam ||
    initialWinner === awayTeam ||
    initialWinner === DRAW_PICK;
  const [hasSavedPrediction, setHasSavedPrediction] = useState(hasExistingPrediction);
  const [bonusByPrompt, setBonusByPrompt] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function save() {
    if (teamsPending) return;
    if (locked) {
      toastPredictionLocked();
      return;
    }
    setLoading(true);
    try {
      const bonus_answers = Object.entries(bonusByPrompt)
        .map(([prompt_id, answer_text]) => ({ prompt_id, answer_text }))
        .filter((b) => b.answer_text.trim().length > 0);

      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          match_id: matchId,
          predicted_winner: winner,
          bonus_answers: bonus_answers.length ? bonus_answers : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 403 && data.error === "MATCH_LOCKED") {
        toastPredictionLocked();
        return;
      }
      if (!res.ok) {
        toastPredictionError(data.error ?? data.message);
        return;
      }
      toastPredictionRecorded(
        matchLabel,
        Boolean(data.was_update),
        typeof data.message === "string" ? data.message : undefined,
      );
      setHasSavedPrediction(true);
    } finally {
      setLoading(false);
    }
  }

  if (teamsPending) return null;

  const pickClass = (selected: boolean) =>
    selected
      ? "border-wc-cta bg-wc-cta/20 text-white shadow-[0_0_12px_rgba(16,182,155,0.2)]"
      : "border-white/15 bg-white/5 text-white/80 hover:border-white/30 hover:bg-white/10";

  return (
    <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
      <fieldset disabled={locked} className="space-y-2">
        <legend className="text-xs font-semibold uppercase tracking-wide text-wc-yellow/90">
          Your pick
        </legend>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <label
            className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all ${pickClass(winner === homeTeam)}`}
          >
            <input
              type="radio"
              name={`winner-${matchId}`}
              className="accent-wc-cta"
              checked={winner === homeTeam}
              onChange={() => setWinner(homeTeam)}
            />
            {homeTeam}
          </label>
          <label
            className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all ${pickClass(winner === awayTeam)}`}
          >
            <input
              type="radio"
              name={`winner-${matchId}`}
              className="accent-wc-cta"
              checked={winner === awayTeam}
              onChange={() => setWinner(awayTeam)}
            />
            {awayTeam}
          </label>
          <label
            className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all ${pickClass(winner === DRAW_PICK)}`}
          >
            <input
              type="radio"
              name={`winner-${matchId}`}
              className="accent-wc-cta"
              checked={winner === DRAW_PICK}
              onChange={() => setWinner(DRAW_PICK)}
            />
            Draw
          </label>
        </div>
      </fieldset>
      <BonusPromptsForm
        matchId={matchId}
        answers={bonusByPrompt}
        onAnswersLoaded={(loadedAnswers) =>
          setBonusByPrompt((prev) => {
            const next = { ...prev };
            for (const [promptId, value] of Object.entries(loadedAnswers)) {
              if (!next[promptId]?.trim()) next[promptId] = value;
            }
            return next;
          })
        }
        onAnswerChange={(promptId, value) =>
          setBonusByPrompt((prev) => ({ ...prev, [promptId]: value }))
        }
      />
      <Button
        type="button"
        className="w-full sm:w-auto"
        disabled={locked || loading}
        onClick={save}
      >
        {hasSavedPrediction ? "Update Prediction" : "Save Prediction"}
      </Button>
    </div>
  );
}
