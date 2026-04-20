"use client";

import { useEffect, useState } from "react";
import { StructuredPromptChoice } from "@/components/matches/structured-prompt-choice";

type PromptOption = { label: string; value: string; sort_order?: number };

type Prompt = {
  id: string;
  prompt_text: string;
  scope: string;
  input_type?: string | null;
  options?: PromptOption[];
};

type Props = {
  matchId: string;
  answers: Record<string, string>;
  onAnswerChange: (promptId: string, value: string) => void;
};

export function BonusPromptsForm({ matchId, answers, onAnswerChange }: Props) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(
        `/api/matches/bonus-prompts?match_id=${encodeURIComponent(matchId)}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = await res.json();
      if (!cancelled) {
        setPrompts((data.prompts ?? []) as Prompt[]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  if (!prompts.length) return null;
  return (
    <div className="space-y-3">
      {prompts.map((p) => {
        const opts = p.options ?? [];
        const isSingle =
          String(p.input_type ?? "")
            .trim()
            .toLowerCase() === "single_choice";
        const useStructured = isSingle && opts.length > 0;
        const needsOptions = isSingle && opts.length === 0;
        return (
          <div key={p.id}>
            <label className="text-xs font-medium text-foreground">{p.prompt_text}</label>
            {useStructured ? (
              <StructuredPromptChoice
                idPrefix={`bonus-${p.id}`}
                name={`bonus-${p.id}`}
                options={opts}
                value={answers[p.id] ?? ""}
                onChange={(v) => onAnswerChange(p.id, v)}
              />
            ) : (
              <>
                {needsOptions ? (
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                    No choices loaded for this match prompt. In Admin → Bonus prompts, open the row for{" "}
                    <strong>this fixture</strong> (match-scoped), set Single choice, add lines under
                    &quot;Choices for players&quot;, and Save options — not only the season-wide prompts on
                    the Mega Bonus tab.
                  </p>
                ) : null}
                <input
                  className="mt-1 w-full rounded-md border border-input px-2 py-2 text-sm text-foreground"
                  value={answers[p.id] ?? ""}
                  onChange={(e) => onAnswerChange(p.id, e.target.value)}
                  placeholder="Your answer"
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
