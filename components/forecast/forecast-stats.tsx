"use client";

import { useEffect, useState } from "react";

type StatRow = { team: string; count: number; pct?: number };

type Stats = {
  total_forecasts: number;
  show_percentages: boolean;
  semi_finalists: StatRow[];
  finalists: StatRow[];
  winners: StatRow[];
};

function StatBlock({ title, rows, showPct }: { title: string; rows: StatRow[]; showPct: boolean }) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="mb-2 text-sm font-semibold">{title}</p>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">No data yet.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {rows.map((r) => (
            <li key={r.team}>
              {r.team}: {r.count}
              {showPct && r.pct != null ? ` (${r.pct}%)` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ForecastStatsView() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/forecast/stats");
      if (res.status === 403) {
        setError("Forecast statistics are not public yet.");
        return;
      }
      if (!res.ok) {
        setError("Could not load statistics.");
        return;
      }
      setStats(await res.json());
    })();
  }, []);

  if (error) return <p className="text-sm text-muted-foreground">{error}</p>;
  if (!stats) return <p className="text-sm text-muted-foreground">Loading statistics…</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {stats.total_forecasts} forecast{stats.total_forecasts === 1 ? "" : "s"} submitted.
        {!stats.show_percentages && stats.total_forecasts > 0 && stats.total_forecasts < 3
          ? " Percentages hidden until at least 3 forecasts exist."
          : ""}
      </p>
      <StatBlock title="Semi-finalists" rows={stats.semi_finalists} showPct={stats.show_percentages} />
      <StatBlock title="Finalists" rows={stats.finalists} showPct={stats.show_percentages} />
      <StatBlock title="Winner" rows={stats.winners} showPct={stats.show_percentages} />
    </div>
  );
}
