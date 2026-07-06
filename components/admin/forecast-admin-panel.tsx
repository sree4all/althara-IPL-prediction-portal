"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ForecastAdminPanel({
  initialForecastStatsVisible,
}: {
  initialForecastStatsVisible: boolean;
}) {
  const [statsVisible, setStatsVisible] = useState(initialForecastStatsVisible);
  const [syncBusy, setSyncBusy] = useState(false);
  const [scoringBusy, setScoringBusy] = useState(false);

  async function saveVisibility(next: boolean) {
    const res = await fetch("/api/admin/forecast/visibility", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ forecast_stats_visible: next }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error ?? "Could not update forecast stats visibility.");
      return;
    }
    setStatsVisible(next);
    toast.success(next ? "Member forecast picks are visible to all." : "Forecast picks are admin-only.");
  }

  async function syncSchedule() {
    setSyncBusy(true);
    try {
      const res = await fetch("/api/admin/fifa/sync-schedule", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.errors?.[0] ?? data.error ?? "Sync failed.");
        return;
      }
      toast.success(`Synced metadata for ${data.updated ?? 0} fixtures.`);
    } finally {
      setSyncBusy(false);
    }
  }

  async function applyForecastScoring() {
    setScoringBusy(true);
    try {
      const res = await fetch("/api/admin/forecast/apply-scoring", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Forecast scoring failed.");
        return;
      }
      toast.success(data.message ?? "Forecast scoring applied.");
    } finally {
      setScoringBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-md border border-border p-3">
      <p className="text-sm font-semibold">Tournament Forecast &amp; FIFA schedule</p>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={statsVisible}
          onChange={(e) => void saveVisibility(e.target.checked)}
        />
        Show member forecast picks to all members
      </label>
      <p className="text-xs text-muted-foreground">
        Off by default — only admins see the picks list. When on, every signed-in member can view
        all forecasts (like Prediction Stat).
      </p>

      <Button type="button" size="sm" variant="outline" disabled={syncBusy} onClick={() => void syncSchedule()}>
        {syncBusy ? "Syncing…" : "Sync FIFA schedule (times & numbers)"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Updates kickoff times and match numbers from docs/fifa without overwriting team names.
      </p>

      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={scoringBusy}
        onClick={() => void applyForecastScoring()}
      >
        {scoringBusy ? "Scoring…" : "Apply forecast scoring"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Awards 10 / 15 / 20 pts for correct semi-finalists, finalists, and winner. Also runs
        automatically when QF, SF, or Final results are recorded.
      </p>
    </div>
  );
}

export function OddMatchBonusAdminAction() {
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/bonus/generate-odd-matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 5 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Generation failed.");
        return;
      }
      const n = (data.created as unknown[])?.length ?? 0;
      toast.success(`Created ${n} odd-match bonus prompt(s).`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-sm font-semibold">AI odd-match bonuses</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Generates +3 / 0 point bonuses for odd-numbered fixtures without an active prompt. Requires{" "}
        <code className="text-xs">OPENAI_API_KEY</code> for LLM drafts (falls back to templates).
      </p>
      <Button type="button" size="sm" className="mt-2" disabled={busy} onClick={() => void generate()}>
        {busy ? "Generating…" : "Generate missing odd-match bonuses"}
      </Button>
    </div>
  );
}
