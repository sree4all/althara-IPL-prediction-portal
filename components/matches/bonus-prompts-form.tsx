"use client";

import { useEffect, useRef, useState } from "react";
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
  onAnswersLoaded?: (loadedAnswers: Record<string, string>) => void;
};

export function BonusPromptsForm({ matchId, answers, onAnswerChange, onAnswersLoaded }: Props) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const onAnswersLoadedRef = useRef(onAnswersLoaded);
  onAnswersLoadedRef.current = onAnswersLoaded;

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
        const loadedMap: Record<string, string> = {};
        (data.answers ?? []).forEach((a: { prompt_id: string; answer_text: string }) => {
          loadedMap[a.prompt_id] = a.answer_text;
        });
        onAnswersLoadedRef.current?.(loadedMap);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  if (!prompts.length) {
    return (
      <p className="text-xs text-muted-foreground">
        Watch for bonus prompts—organizers may post questions on this match before kickoff.
      </p>
    );
  }
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
                    Choices for this bonus prompt are not loaded yet. Check back soon—organizers may
                    post bonus questions before kickoff.
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
