"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Config = {
  match_winner_points: number;
  match_bonus_points: number;
  tournament_slot_points: number[];
};

export function ScoringConfigSection() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/scoring-config");
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = await res.json();
      const c = data.config;
      if (!c) {
        setLoading(false);
        return;
      }
      let slots: number[] = [2, 2, 2, 2, 3, 3, 5, 3, 3];
      try {
        const raw = c.tournament_slot_points;
        if (Array.isArray(raw)) slots = raw.map((n: number) => Number(n));
        else if (typeof raw === "string") slots = JSON.parse(raw);
      } catch {
        /* keep default */
      }
      setCfg({
        match_winner_points: Number(c.match_winner_points ?? 2),
        match_bonus_points: Number(c.match_bonus_points ?? 2),
        tournament_slot_points: slots,
      });
      setLoading(false);
    })();
  }, []);

  async function save() {
    if (!cfg) return;
    setSaving(true);
    const res = await fetch("/api/admin/scoring-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        match_winner_points: cfg.match_winner_points,
        match_bonus_points: cfg.match_bonus_points,
        tournament_slot_points: cfg.tournament_slot_points,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
    setSaving(false);
    if (res.ok) {
      toast.success(data.message ?? "Scoring config saved.");
    } else {
      toast.error(data.error ?? "Could not save scoring config.");
    }
  }

  if (loading || !cfg) {
    return <p className="text-sm text-muted-foreground">Loading scoring config…</p>;
  }

  return (
    <div className="rounded-md border border-border p-3">
      <p className="mb-2 text-sm font-semibold">Scoring points (season 2026)</p>
      <p className="mb-3 text-xs text-muted-foreground">
        Same idea as the spreadsheet: correct winner and correct bonus each use their point value;
        wrong winner → 0 for that part; empty or wrong bonus → 0 for bonus.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs">
          Points for correct winner
          <input
            type="number"
            className="mt-1 w-full rounded-md border border-input px-2 py-1 text-sm"
            value={cfg.match_winner_points}
            onChange={(e) =>
              setCfg((c) =>
                c ? { ...c, match_winner_points: Number(e.target.value) } : c,
              )
            }
          />
        </label>
        <label className="text-xs">
          Points for correct match bonus
          <input
            type="number"
            className="mt-1 w-full rounded-md border border-input px-2 py-1 text-sm"
            value={cfg.match_bonus_points}
            onChange={(e) =>
              setCfg((c) =>
                c ? { ...c, match_bonus_points: Number(e.target.value) } : c,
              )
            }
          />
        </label>
      </div>
      <p className="mt-3 text-xs font-medium">Tournament slots (1–9)</p>
      <div className="mt-1 grid grid-cols-3 gap-2 sm:grid-cols-5">
        {cfg.tournament_slot_points.map((p, i) => (
          <label key={i} className="text-xs">
            Slot {i + 1}
            <input
              type="number"
              className="mt-1 w-full rounded-md border border-input px-1 py-1 text-sm"
              value={p}
              onChange={(e) => {
                const v = Number(e.target.value);
                setCfg((c) => {
                  if (!c) return c;
                  const next = [...c.tournament_slot_points];
                  next[i] = v;
                  return { ...c, tournament_slot_points: next };
                });
              }}
            />
          </label>
        ))}
      </div>
      <Button type="button" size="sm" className="mt-3" onClick={save} disabled={saving}>
        Save scoring config
      </Button>
    </div>
  );
}
