"use client";

import { useEffect, useState } from "react";

type Entry = {
  user_id: string;
  display_name: string;
  semi_finalist_teams: string[];
  finalist_teams: string[];
  winner_team: string | null;
};

function formatTeams(teams: string[]) {
  return teams.length > 0 ? teams.join(", ") : "—";
}

export function ForecastStatsView() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
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
    })();
  }, []);

  if (error) return <p className="text-sm text-muted-foreground">{error}</p>;
  if (entries === null) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No tournament forecasts submitted yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 font-medium">Player</th>
            <th className="px-3 py-2 font-medium">Semi-finalists</th>
            <th className="px-3 py-2 font-medium">Finalists</th>
            <th className="px-3 py-2 font-medium">Winner</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.user_id} className="border-t border-border">
              <td className="px-3 py-2 align-top">{e.display_name}</td>
              <td className="px-3 py-2 align-top text-muted-foreground">
                {formatTeams(e.semi_finalist_teams)}
              </td>
              <td className="px-3 py-2 align-top text-muted-foreground">
                {formatTeams(e.finalist_teams)}
              </td>
              <td className="px-3 py-2 align-top">{e.winner_team ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
