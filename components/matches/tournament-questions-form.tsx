"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { StructuredPromptChoice } from "@/components/matches/structured-prompt-choice";
import { toastPredictionError } from "@/lib/toasts/prediction-feedback";

type QuestionOption = { label: string; value: string; sort_order?: number };

type Question = {
  id: string;
  slot_no: number;
  question_text: string;
  options?: QuestionOption[];
};

type Props = { standalone?: boolean };

export function TournamentQuestionsForm({ standalone = false }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/tournament/questions");
      if (!res.ok) return;
      const data = await res.json();
      if (data.season_bonuses_tab_visible === false) {
        setQuestions([]);
        return;
      }
      setLocked(Boolean(data.is_locked));
      setQuestions(data.questions ?? []);
      const map: Record<string, string> = {};
      (data.answers ?? []).forEach((a: { question_id: string; answer_text: string }) => {
        map[a.question_id] = a.answer_text;
      });
      setAnswers(map);
    })();
  }, []);

  async function save() {
    const payload = questions.map((q) => ({
      question_id: q.id,
      answer_text: answers[q.id] ?? "",
    }));
    const res = await fetch("/api/tournament/answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: payload }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toastPredictionError(data.error);
    }
  }

  if (!questions.length) {
    return standalone ? (
      <p className="text-sm text-muted-foreground">No Mega Bonus questions are configured yet.</p>
    ) : null;
  }
  return (
    <div className={standalone ? "rounded-md border border-border p-4" : "mt-3 rounded-md border border-border p-3"}>
      <p className="mb-2 text-sm font-semibold">Mega Bonus</p>
      <fieldset disabled={locked} className="space-y-3">
        {questions.map((q) => {
          const opts = q.options ?? [];
          const useStructured = opts.length > 0;
          return (
            <div key={q.id}>
              <label className="text-xs font-medium text-foreground">
                {q.slot_no}. {q.question_text}
              </label>
              {useStructured ? (
                <StructuredPromptChoice
                  idPrefix={`tq-${q.id}`}
                  name={`tq-${q.id}`}
                  options={opts}
                  value={answers[q.id] ?? ""}
                  onChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
                />
              ) : (
                <input
                  value={answers[q.id] ?? ""}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-input px-2 py-2 text-sm text-foreground"
                  placeholder="Your answer"
                />
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
