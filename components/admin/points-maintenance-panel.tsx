"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function PointsMaintenancePanel() {
  const [busy, setBusy] = useState<"recompute" | "sync" | null>(null);

  async function recomputeAll() {
    setBusy("recompute");
    const res = await fetch("/api/admin/scoring/recompute-all-matches", { method: "POST" });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      processed?: number;
      failures?: { matchId: string; error: string }[];
      error?: string;
    };
    setBusy(null);
    if (!res.ok) {
      toast.error(data.error ?? "Recompute failed.");
      return;
    }
    const failed = data.failures?.length ?? 0;
    toast.success(
      `Re-scored ${data.processed ?? 0} completed match(es).` +
        (failed > 0 ? ` ${failed} match(es) skipped (missing winner or stage config).` : ""),
    );
  }

  async function syncFromLedger() {
    setBusy("sync");
    const res = await fetch("/api/admin/scoring/sync-profile-points", { method: "POST" });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      message?: string;
      error?: string;
    };
    setBusy(null);
    if (!res.ok) {
      toast.error(data.error ?? "Sync failed.");
      return;
    }
    toast.success(data.message ?? "Leaderboard totals synced from ledger.");
  }

  return (
    <div className="rounded-md border border-border p-3 space-y-3">
      <div>
        <p className="text-sm font-semibold">Points maintenance</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Try <strong>Sync leaderboard</strong> first — it is fast. Use recompute only after
          changing match results or bonus answers.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy !== null}
          onClick={() => void syncFromLedger()}
        >
          {busy === "sync" ? "Syncing…" : "Sync leaderboard from ledger"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busy !== null}
          onClick={() => void recomputeAll()}
        >
          {busy === "recompute" ? "Recomputing…" : "Recompute all completed matches"}
        </Button>
      </div>
      <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
        <li>
          <strong>Sync leaderboard</strong> — rebuilds standings from the points ledger (usually a few
          seconds). Use this when totals look wrong but match results are already correct.
        </li>
        <li>
          <strong>Recompute</strong> — re-runs winner + M31 bonus scoring for every completed match.
          Slower; only needed after editing results or bonus answers.
        </li>
      </ul>
    </div>
  );
}
