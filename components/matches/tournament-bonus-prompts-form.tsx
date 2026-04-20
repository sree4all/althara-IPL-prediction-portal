"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { StructuredPromptChoice } from "@/components/matches/structured-prompt-choice";
import { toastPredictionError } from "@/lib/toasts/prediction-feedback";

type Opt = { label: string; value: string; sort_order?: number };

type Prompt = {
  id: string;
  prompt_text: string;
  input_type?: string | null;
  options?: Opt[];
};

export function TournamentBonusPromptsForm() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/tournament/bonus-prompts");
      if (!res.ok) return;
      const data = await res.json();
      if (data.season_bonuses_tab_visible === false) {
        setPrompts([]);
        return;
      }
      setPrompts((data.prompts ?? []) as Prompt[]);
      const map: Record<string, string> = {};
      (data.answers ?? []).forEach((a: { prompt_id: string; answer_text: string }) => {
        map[a.prompt_id] = a.answer_text;
      });
      setAnswers(map);
      const q = await fetch("/api/tournament/questions");
      if (q.ok) {
        const qd = await q.json();
        setLocked(Boolean(qd.is_locked));
      }
    })();
  }, []);

  async function save() {
    const bonus_answers = prompts.map((p) => ({
      prompt_id: p.id,
      answer_text: answers[p.id] ?? "",
    }));
    const res = await fetch("/api/tournament/bonus-answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bonus_answers }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toastPredictionError(data.error);
      return;
    }
    toast.success(
      typeof data.message === "string" && data.message
        ? data.message
        : "Mega Bonus answers saved successfully.",
    );
  }

  if (!prompts.length) return null;

  return (
    <div className="rounded-md border border-border p-4">
      <p className="mb-2 text-sm font-semibold">Mega Bonus prompts</p>
      <p className="mb-3 text-xs text-muted-foreground">
        These apply to the whole season, not to individual matches.
      </p>
      <fieldset disabled={locked} className="space-y-3">
        {prompts.map((p) => {
          const opts = p.options ?? [];
          const useStructured = p.input_type === "single_choice" && opts.length > 0;
          const needsOptions = p.input_type === "single_choice" && opts.length === 0;
          return (
            <div key={p.id}>
              <label className="text-xs font-medium text-foreground">{p.prompt_text}</label>
              {useStructured ? (
                <StructuredPromptChoice
                  idPrefix={`tbp-${p.id}`}
                  name={`tbp-${p.id}`}
                  options={opts}
                  value={answers[p.id] ?? ""}
                  onChange={(v) => setAnswers((prev) => ({ ...prev, [p.id]: v }))}
                />
              ) : (
                <>
                  {needsOptions ? (
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                      Add choices in Admin (Bonus prompts → options) for this prompt.
                    </p>
                  ) : null}
                  <input
                    value={answers[p.id] ?? ""}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-input px-2 py-2 text-sm text-foreground"
                    placeholder="Your answer"
                  />
                </>
              )}
            </div>
          );
        })}
      </fieldset>
      <Button type="button" size="sm" className="mt-3" onClick={save} disabled={locked}>
        Save Mega Bonus answers
      </Button>
    </div>
  );
}
