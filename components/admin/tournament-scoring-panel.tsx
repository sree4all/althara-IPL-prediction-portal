"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Question = {
  id: string;
  slot_no: number;
  question_text: string;
  correct_answer: string | null;
  scored_at: string | null;
};

type Opt = { label: string; value: string; sort_order: number };

export function TournamentScoringPanel({
  questions: initial,
  optionsByQuestion: initialOpts = {},
}: {
  questions: Question[];
  optionsByQuestion?: Record<string, Opt[]>;
}) {
  const [questions, setQuestions] = useState(initial);
  const [optionsByQuestion, setOptionsByQuestion] = useState(initialOpts);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const top4Group = questions.filter((q) => q.slot_no >= 1 && q.slot_no <= 4);
  const finalistsGroup = questions.filter((q) => q.slot_no >= 5 && q.slot_no <= 6);
  const [top4Shared, setTop4Shared] = useState(
    top4Group.find((q) => (q.correct_answer ?? "").trim())?.correct_answer ?? "",
  );
  const [finalistsShared, setFinalistsShared] = useState(
    finalistsGroup.find((q) => (q.correct_answer ?? "").trim())?.correct_answer ?? "",
  );

  async function saveAnswer(id: string, correct_answer: string) {
    const res = await fetch(`/api/admin/tournament-questions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correct_answer: correct_answer.trim() || null }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setMsg(d.error ?? "Save failed");
      return;
    }
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, correct_answer: correct_answer.trim() || null } : q)),
    );
    setMsg(null);
  }

  async function saveSharedAnswers(ids: string[], raw: string) {
    for (const id of ids) {
      // Keep one shared list persisted on each grouped slot to simplify scoring reads.
      // API supports per-question update only, so submit sequentially.
      await saveAnswer(id, raw);
    }
  }

  async function saveOptions(id: string, raw: string) {
    const lines = raw.split(/\r?\n/).filter((l) => l.trim());
    const options = lines
      .map((line, i) => {
        const [a, b] = line.split("|").map((s) => s.trim());
        const label = a ?? "";
        const value = b || a || "";
        return { label, value, sort_order: i };
      })
      .filter((o) => o.label && o.value);
    const res = await fetch(`/api/admin/tournament-questions/${id}/options`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ options }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setMsg(d.error ?? "Save options failed");
      return;
    }
    setOptionsByQuestion((prev) => ({ ...prev, [id]: options }));
    setMsg("Options saved.");
  }

  async function applyScoring() {
    setMsg(null);
    setBusy(true);
    const res = await fetch("/api/admin/tournament/apply-scoring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ season_year: 2026 }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      const err = data.error ?? "Scoring failed";
      setMsg(err);
      toast.error(String(err));
      return;
    }
    const summary =
      (data as { message?: string }).message ??
      `Tournament scoring applied. Ledger rows: ${data.ledger_rows ?? 0}.`;
    setMsg(summary);
    toast.success(summary);
  }

  return (
    <div className="rounded-md border border-border p-3">
      <p className="mb-2 text-sm font-semibold">Tournament answers &amp; scoring</p>
      <p className="mb-3 text-xs text-muted-foreground">
        Player-facing visibility for the whole Mega Bonus tab is set under Tournament lock (Admin).
        Here: allowed answers (one line: label | value), then the correct answer for scoring.
      </p>
      <div className="mb-4 space-y-3 rounded border border-border p-3">
        <p className="text-xs font-semibold text-foreground">Set-based grouped scoring answers</p>
        <label className="block text-xs text-muted-foreground">
          Top 4 teams (applies to Q1–Q4; one team scores once only)
          <textarea
            className="mt-1 min-h-[4rem] w-full rounded-md border border-input px-2 py-1 text-sm"
            placeholder="One team per line, e.g. PBKS"
            value={top4Shared}
            onChange={(e) => setTop4Shared(e.target.value)}
          />
        </label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void saveSharedAnswers(top4Group.map((q) => q.id), top4Shared)}
        >
          Save Top 4 list to Q1–Q4
        </Button>
        <label className="block text-xs text-muted-foreground">
          Finalists (applies to Q5–Q6; one team scores once only)
          <textarea
            className="mt-1 min-h-[3rem] w-full rounded-md border border-input px-2 py-1 text-sm"
            placeholder="One team per line, e.g. RCB"
            value={finalistsShared}
            onChange={(e) => setFinalistsShared(e.target.value)}
          />
        </label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void saveSharedAnswers(finalistsGroup.map((q) => q.id), finalistsShared)}
        >
          Save Finalists list to Q5–Q6
        </Button>
      </div>
      {msg ? <p className="mb-2 text-xs text-muted-foreground">{msg}</p> : null}
      <ul className="space-y-3">
        {questions.map((q) => {
          const isGroupedSlot = q.slot_no >= 1 && q.slot_no <= 6;
          const optLines =
            (optionsByQuestion[q.id] ?? [])
              .map((o) => `${o.label} | ${o.value}`)
              .join("\n") || "";
          return (
            <li key={q.id} className="rounded border border-border px-2 py-2 text-sm">
              <div className="text-xs text-muted-foreground">
                Slot {q.slot_no}
                {q.scored_at ? " · scored" : ""}
              </div>
              <div className="font-medium">{q.question_text}</div>
              <div className="mt-2 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Answer options (for players)</p>
                <textarea
                  key={`opt-${q.id}-${(optionsByQuestion[q.id] ?? []).length}`}
                  className="min-h-[4rem] w-full rounded-md border border-input px-2 py-1 font-mono text-xs"
                  placeholder={"One per line: Label | value"}
                  defaultValue={optLines}
                  id={`opt-${q.id}`}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const raw =
                      (document.getElementById(`opt-${q.id}`) as HTMLTextAreaElement)?.value ?? "";
                    void saveOptions(q.id, raw);
                  }}
                >
                  Save options
                </Button>
              </div>
              {isGroupedSlot ? (
                <p className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
                  Correct-answer input is managed by shared sets above for this slot group.
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2 border-t border-border pt-2">
                  <input
                    className="min-w-[12rem] flex-1 rounded-md border border-input px-2 py-1 text-sm"
                    placeholder="Correct answer"
                    defaultValue={q.correct_answer ?? ""}
                    id={`ta-${q.id}`}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const el = document.getElementById(`ta-${q.id}`) as HTMLInputElement | null;
                      void saveAnswer(q.id, el?.value ?? "");
                    }}
                  >
                    Save answer
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <Button type="button" className="mt-4" size="sm" onClick={applyScoring} disabled={busy}>
        Apply tournament scoring
      </Button>
    </div>
  );
}
