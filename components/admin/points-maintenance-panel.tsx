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
        (failed > 0 ? ` ${failed} match(es) had errors — check match results first.` : ""),
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
          Use these after fixing scores or cleaning old bonus data. No terminal access needed.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busy !== null}
          onClick={() => void recomputeAll()}
        >
          {busy === "recompute" ? "Recomputing…" : "Recompute all completed matches"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy !== null}
          onClick={() => void syncFromLedger()}
        >
          {busy === "sync" ? "Syncing…" : "Sync leaderboard from ledger"}
        </Button>
      </div>
      <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
        <li>
          <strong>Recompute</strong> — re-runs winner + match bonus scoring for every completed
          match (including M31 bonus). Run after entering or correcting match results.
        </li>
        <li>
          <strong>Sync leaderboard</strong> — rebuilds stored totals from the points ledger if the
          leaderboard looks wrong.
        </li>
      </ul>
    </div>
  );
}
