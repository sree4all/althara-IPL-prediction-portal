"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PredictionHistoryTable } from "@/components/history/prediction-history-table";
import { Button } from "@/components/ui/button";

type MatchResult = { id: string; display_name: string; current_points: number };

type AuditPayload = {
  profile: {
    id: string;
    display_name: string;
    email: string | null;
    current_points: number;
  };
  ledger_total: number;
  drift: number;
  history_rows: {
    source_id: string;
    label: string;
    prediction: string;
    points_delta: number | null;
    status: string;
    updated_at: string;
  }[];
  ledger_rows: {
    id: string;
    source_type: string;
    label: string;
    reason: string | null;
    points_delta: number;
    awarded_at: string;
  }[];
};

export function PlayerAuditPanel() {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [audit, setAudit] = useState<AuditPayload | null>(null);
  const [busy, setBusy] = useState(false);

  async function search() {
    const q = query.trim();
    if (!q) {
      toast.error("Enter a player name.");
      return;
    }
    setBusy(true);
    setAudit(null);
    const res = await fetch(`/api/admin/players/audit?q=${encodeURIComponent(q)}`);
    const data = (await res.json().catch(() => ({}))) as {
      matches?: MatchResult[];
      error?: string;
    };
    setBusy(false);
    if (!res.ok) {
      toast.error(data.error ?? "Search failed.");
      return;
    }
    setMatches(data.matches ?? []);
    if ((data.matches ?? []).length === 0) {
      toast.message("No players matched that name.");
    }
  }

  async function loadAudit(userId: string) {
    setBusy(true);
    const res = await fetch(`/api/admin/players/audit?user_id=${encodeURIComponent(userId)}`);
    const data = (await res.json().catch(() => ({}))) as { audit?: AuditPayload; error?: string };
    setBusy(false);
    if (!res.ok || !data.audit) {
      toast.error(data.error ?? "Could not load audit.");
      return;
    }
    setAudit(data.audit);
    setMatches([]);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Look up any player&apos;s predictions and points ledger. Leaderboard totals should equal the
        ledger sum.
      </p>

      <div className="flex flex-wrap gap-2">
        <input
          className="min-w-[12rem] flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="Player name, e.g. Arya"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void search();
          }}
        />
        <Button type="button" size="sm" disabled={busy} onClick={() => void search()}>
          {busy ? "Loading…" : "Search"}
        </Button>
      </div>

      {matches.length > 0 ? (
        <ul className="rounded-md border border-border divide-y divide-border text-sm">
          {matches.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted/40"
                onClick={() => void loadAudit(m.id)}
              >
                <span className="font-medium">{m.display_name}</span>
                <span className="tabular-nums text-muted-foreground">{m.current_points} pts</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {audit ? (
        <div className="space-y-4">
          <div className="rounded-md border border-border bg-muted/20 p-3 text-sm">
            <p className="font-semibold">{audit.profile.display_name}</p>
            {audit.profile.email ? (
              <p className="text-muted-foreground">{audit.profile.email}</p>
            ) : null}
            <dl className="mt-2 grid gap-1 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">Profile points</dt>
                <dd className="font-medium tabular-nums">{audit.profile.current_points}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Ledger sum</dt>
                <dd className="font-medium tabular-nums">{audit.ledger_total}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Drift</dt>
                <dd
                  className={
                    audit.drift === 0
                      ? "font-medium tabular-nums text-green-600"
                      : "font-medium tabular-nums text-destructive"
                  }
                >
                  {audit.drift > 0 ? "+" : ""}
                  {audit.drift}
                </dd>
              </div>
            </dl>
            {audit.drift !== 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Drift means stored profile points don&apos;t match the ledger. Use{" "}
                <Link href="/admin" className="underline underline-offset-2">
                  Scoring Configuration → Sync leaderboard
                </Link>
                .
              </p>
            ) : null}
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold">Predictions &amp; scored points</h2>
            <PredictionHistoryTable rows={audit.history_rows} />
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold">Points ledger (audit trail)</h2>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left">
                    <th className="px-3 py-2">When</th>
                    <th className="px-3 py-2">Source</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.ledger_rows.map((row) => (
                    <tr key={row.id} className="border-b border-border">
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(row.awarded_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">{row.label}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{row.source_type}</td>
                      <td className="px-3 py-2 tabular-nums">{row.points_delta}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30 font-medium">
                    <td className="px-3 py-2" colSpan={3}>
                      Total
                    </td>
                    <td className="px-3 py-2 tabular-nums">{audit.ledger_total}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
