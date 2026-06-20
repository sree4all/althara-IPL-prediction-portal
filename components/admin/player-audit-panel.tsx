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
  ledger_row_count: number;
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
  match_breakdown: {
    match_id: string;
    label: string;
    winner_points: number;
    bonus_points: number;
    total: number;
  }[];
};

export function PlayerAuditPanel() {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [audit, setAudit] = useState<AuditPayload | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadAudit(userId: string) {
    setBusy(true);
    setAudit(null);
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
    const found = data.matches ?? [];
    if (found.length === 0) {
      setMatches([]);
      toast.message("No players matched that name.");
      return;
    }
    if (found.length === 1) {
      await loadAudit(found[0]!.id);
      return;
    }
    setMatches(found);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Search a player to see every ledger line that makes up their score. If you only see a profile
        total with zero ledger rows, run{" "}
        <Link href="/admin" className="underline underline-offset-2">
          Sync leaderboard
        </Link>{" "}
        after fixing data.
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

      {matches.length > 1 ? (
        <ul className="divide-y divide-border rounded-md border border-border text-sm">
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
            <dl className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-xs text-muted-foreground">Profile / leaderboard</dt>
                <dd className="text-lg font-semibold tabular-nums">{audit.profile.current_points}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Ledger sum</dt>
                <dd className="text-lg font-semibold tabular-nums">{audit.ledger_total}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Ledger lines</dt>
                <dd className="text-lg font-semibold tabular-nums">{audit.ledger_row_count}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Drift</dt>
                <dd
                  className={
                    audit.drift === 0
                      ? "text-lg font-semibold tabular-nums text-green-600"
                      : "text-lg font-semibold tabular-nums text-destructive"
                  }
                >
                  {audit.drift > 0 ? "+" : ""}
                  {audit.drift}
                </dd>
              </div>
            </dl>
          </div>

          {audit.ledger_row_count === 0 ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              No rows in <code className="text-xs">points_ledger</code> for this player. The{" "}
              {audit.profile.current_points} on the leaderboard is stored on the profile only — not
              from scored ledger entries. Use Sync leaderboard or recompute after entering results.
            </p>
          ) : null}

          {audit.match_breakdown.length > 0 ? (
            <div>
              <h2 className="mb-2 text-sm font-semibold">Points by match (from ledger)</h2>
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left">
                      <th className="px-3 py-2">Match</th>
                      <th className="px-3 py-2">Winner</th>
                      <th className="px-3 py-2">Bonus</th>
                      <th className="px-3 py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit.match_breakdown.map((row) => (
                      <tr key={row.match_id} className="border-b border-border">
                        <td className="px-3 py-2">{row.label}</td>
                        <td className="px-3 py-2 tabular-nums">{row.winner_points}</td>
                        <td className="px-3 py-2 tabular-nums">{row.bonus_points}</td>
                        <td className="px-3 py-2 font-medium tabular-nums">{row.total}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/30 font-medium">
                      <td className="px-3 py-2" colSpan={3}>
                        Match + bonus subtotal
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {audit.match_breakdown.reduce((s, r) => s + r.total, 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : null}

          <div>
            <h2 className="mb-2 text-sm font-semibold">
              Every ledger line ({audit.ledger_row_count})
            </h2>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left">
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">When</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Reason</th>
                    <th className="px-3 py-2">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.ledger_rows.length === 0 ? (
                    <tr>
                      <td className="px-3 py-4 text-center text-muted-foreground" colSpan={6}>
                        No ledger rows
                      </td>
                    </tr>
                  ) : (
                    audit.ledger_rows.map((row, i) => (
                      <tr key={row.id} className="border-b border-border">
                        <td className="px-3 py-2 tabular-nums text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                          {new Date(row.awarded_at).toLocaleString()}
                        </td>
                        <td className="px-3 py-2">{row.label}</td>
                        <td className="px-3 py-2 text-xs">{row.source_type}</td>
                        <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                          {row.reason ?? "—"}
                        </td>
                        <td className="px-3 py-2 font-medium tabular-nums">{row.points_delta}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30 font-medium">
                    <td className="px-3 py-2" colSpan={5}>
                      Ledger total
                    </td>
                    <td className="px-3 py-2 tabular-nums">{audit.ledger_total}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold">All predictions</h2>
            <PredictionHistoryTable rows={audit.history_rows} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
