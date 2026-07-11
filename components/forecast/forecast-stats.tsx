"use client";

import { useEffect, useState } from "react";
import { normAnswer } from "@/lib/scoring/normalize";

type Entry = {
  user_id: string;
  display_name: string;
  semi_finalist_teams: string[];
  finalist_teams: string[];
  winner_team: string | null;
  forecast_points: number;
};

type Actuals = {
  semi_finalists: string[];
  finalists: string[];
  winner: string | null;
};

function formatTeams(teams: string[], actualSet: Set<string>, scored: boolean) {
  if (teams.length === 0) return "—";
  return teams
    .map((t) => {
      if (!scored) return t;
      const mark = actualSet.has(normAnswer(t)) ? " ✓" : " ✗";
      return `${t}${mark}`;
    })
    .join(", ");
}

export function ForecastStatsView() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [actuals, setActuals] = useState<Actuals | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/forecast/stats");
      if (res.status === 403) {
        setError(
          "Member forecast picks are admin-only. An admin can turn on sharing in the Admin tab.",
        );
        return;
      }
      if (!res.ok) {
        setError("Could not load forecast picks.");
        return;
      }
      const data = await res.json();
      setEntries(data.entries ?? []);
      setActuals(data.actuals ?? null);
    })();
  }, []);

  if (error) return <p className="text-sm text-muted-foreground">{error}</p>;
  if (entries === null) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No tournament forecasts submitted yet.</p>;
  }

  const finalistScored = (actuals?.finalists.length ?? 0) > 0;
  const winnerScored = Boolean(actuals?.winner);
  const actualFinalistSet = new Set((actuals?.finalists ?? []).map(normAnswer));
  const actualWinnerNorm = actuals?.winner ? normAnswer(actuals.winner) : null;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Scoring: 15 pts per correct finalist (max 30), 20 pts for the correct winner.
      </p>
      {finalistScored ? (
        <p className="text-xs text-muted-foreground">
          Actual finalists: {actuals!.finalists.join(", ")}
        </p>
      ) : null}
      {winnerScored ? (
        <p className="text-xs text-muted-foreground">Actual winner: {actuals!.winner}</p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2 font-medium">Player</th>
              <th className="px-3 py-2 font-medium">Pts</th>
              <th className="px-3 py-2 font-medium">Finalists</th>
              <th className="px-3 py-2 font-medium">Winner</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.user_id} className="border-t border-border">
                <td className="px-3 py-2 align-top">{e.display_name}</td>
                <td className="px-3 py-2 align-top font-medium tabular-nums">
                  {e.forecast_points > 0 || finalistScored || winnerScored
                    ? e.forecast_points
                    : "—"}
                </td>
                <td className="px-3 py-2 align-top text-muted-foreground">
                  {formatTeams(e.finalist_teams, actualFinalistSet, finalistScored)}
                </td>
                <td className="px-3 py-2 align-top">
                  {e.winner_team
                    ? winnerScored
                      ? `${e.winner_team}${normAnswer(e.winner_team) === actualWinnerNorm ? " ✓" : " ✗"}`
                      : e.winner_team
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
