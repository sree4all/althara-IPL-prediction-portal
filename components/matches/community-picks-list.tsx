"use client";

import { useEffect, useState } from "react";

type Row = { user_display_name: string; predicted_winner: string };

export function CommunityPicksList({ matchId }: { matchId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [picksRevealed, setPicksRevealed] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/community-picks?match_id=${encodeURIComponent(matchId)}`);
      if (!res.ok) return;
      const data = await res.json();
      setRows(data.rows ?? []);
      setPicksRevealed(data.picks_revealed !== false);
    })();
  }, [matchId]);

  return (
    <div className="rounded-md border border-border p-3">
      <p className="mb-2 text-sm font-semibold">Community Picks</p>
      {!picksRevealed ? (
        <p className="mb-2 text-xs text-muted-foreground">
          Other members&apos; picks unlock at kickoff. You can still see your own pick below.
        </p>
      ) : null}
      <ul className="space-y-1 text-sm">
        {rows.map((r) => (
          <li key={`${r.user_display_name}-${r.predicted_winner}`}>
            {r.user_display_name}: {r.predicted_winner}
          </li>
        ))}
        {rows.length === 0 ? (
          <li className="text-muted-foreground">No picks to show yet.</li>
        ) : null}
      </ul>
    </div>
  );
}
