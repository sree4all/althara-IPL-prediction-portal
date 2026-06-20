"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MATCH_BONUS_POINTS } from "@/lib/scoring/match-bonus-points";
import { Button } from "@/components/ui/button";

type StageRow = {
  stage_slug: string;
  label: string;
  correct_points: number;
  incorrect_points: number;
};

export function StageScoringPanel() {
  const [stages, setStages] = useState<StageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/scoring/stages");
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = await res.json();
      setStages(data.stages ?? []);
      setLoading(false);
    })();
  }, []);

  async function save() {
    setSaving(true);
    const res = await fetch("/api/admin/scoring/stages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stages,
        match_bonus_points: MATCH_BONUS_POINTS,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (res.ok) {
      toast.success(data.message ?? "Scoring configuration saved.");
    } else {
      toast.error(data.error ?? "Could not save.");
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading scoring configuration…</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold">Match-winner points by stage</p>
        <p className="text-xs text-muted-foreground">
          Correct and incorrect prediction values per tournament stage. Applies to Home, Away, and
          Draw picks.
        </p>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[28rem] text-xs">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-2">Stage</th>
                <th className="py-2 pr-2">Correct</th>
                <th className="py-2">Incorrect</th>
              </tr>
            </thead>
            <tbody>
              {stages.map((s, i) => (
                <tr key={s.stage_slug} className="border-b border-border/60">
                  <td className="py-2 pr-2 font-medium">{s.label}</td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      className="w-20 rounded-md border border-input px-2 py-1"
                      value={s.correct_points}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setStages((prev) => {
                          const next = [...prev];
                          next[i] = { ...next[i], correct_points: v };
                          return next;
                        });
                      }}
                    />
                  </td>
                  <td className="py-2">
                    <input
                      type="number"
                      className="w-20 rounded-md border border-input px-2 py-1"
                      value={s.incorrect_points}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setStages((prev) => {
                          const next = [...prev];
                          next[i] = { ...next[i], incorrect_points: v };
                          return next;
                        });
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs">
          Match bonus (correct answer points, e.g. M31)
          <input
            type="number"
            readOnly
            className="mt-1 w-full rounded-md border border-input bg-muted/40 px-2 py-1 text-sm"
            value={MATCH_BONUS_POINTS}
          />
          <span className="mt-1 block text-muted-foreground">Fixed at {MATCH_BONUS_POINTS} points.</span>
        </label>
      </div>

      <Button type="button" size="sm" onClick={save} disabled={saving}>
        Save scoring configuration
      </Button>
    </div>
  );
}
