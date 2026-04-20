"use client";

import { useEffect, useState } from "react";

type GridResponse = {
  season_year: number;
  slot_numbers: number[];
  rows: { user_id: string; display_name: string; answers: string[] }[];
};

export function MegaBonusAnswersOverview() {
  const [data, setData] = useState<GridResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/tournament/all-player-answers");
      if (cancelled) return;
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: string; message?: string };
        if (res.status === 403) {
          setError(j.message ?? "Sharing all player answers is turned off. Ask an admin to enable it.");
        } else if (res.status === 503) {
          setError(j.message ?? j.error ?? "Grid temporarily unavailable.");
        } else {
          setError(j.error ?? j.message ?? "Could not load answers");
        }
        setData(null);
        setLoading(false);
        return;
      }
      const json = (await res.json()) as GridResponse;
      if (!cancelled) {
        setData(json);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading player answers…</p>;
  }
  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }
  if (!data || data.slot_numbers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No Mega Bonus questions configured for this season.</p>
    );
  }
  if (data.rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No saved Mega Bonus answers yet.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[720px] border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="sticky left-0 z-[1] border-r border-border bg-muted/40 px-2 py-2 font-semibold">
              Player
            </th>
            {data.slot_numbers.map((sn) => (
              <th key={sn} className="whitespace-nowrap px-2 py-2 font-semibold">
                Q{sn}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row) => (
            <tr key={row.user_id} className="border-b border-border last:border-b-0">
              <td className="sticky left-0 z-[1] border-r border-border bg-background px-2 py-1.5 font-medium">
                {row.display_name}
              </td>
              {row.answers.map((cell, i) => (
                <td key={`${row.user_id}-${data.slot_numbers[i]}`} className="max-w-[10rem] truncate px-2 py-1.5 text-muted-foreground">
                  {cell || "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
