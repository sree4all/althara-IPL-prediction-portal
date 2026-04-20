"use client";

import { useEffect, useState } from "react";

type MatchOpt = { id: string; label: string; status?: string | null };

type BonusLine = { prompt_id: string; prompt_text: string; answer_text: string };

type Entry = {
  user_id: string;
  display_name: string;
  predicted_winner: string;
  bonus_pick: string | null;
  bonus_answers: BonusLine[];
};

const TERMINAL = new Set(["completed", "abandoned", "cancelled"]);

function pickDefaultMatchId(matches: MatchOpt[]): string {
  for (const m of matches) {
    const s = String(m.status ?? "").toLowerCase();
    if (!TERMINAL.has(s)) return m.id;
  }
  return matches[0]?.id ?? "";
}

export default function PredictionStatPage() {
  const [matches, setMatches] = useState<MatchOpt[] | null>(null);
  const [matchId, setMatchId] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [matchLabel, setMatchLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/prediction-stat/matches", { cache: "no-store" });
      if (!res.ok) {
        if (!cancelled) setError("Could not load matches.");
        return;
      }
      const data = await res.json();
      if (!cancelled) {
        const list = (data.matches ?? []) as MatchOpt[];
        setMatches(list);
        setMatchId(pickDefaultMatchId(list));
        setError(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!matchId) {
      setEntries([]);
      setMatchLabel(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const res = await fetch(
        `/api/prediction-stat/by-match?match_id=${encodeURIComponent(matchId)}`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        if (!cancelled) {
          setError("Could not load predictions for this match.");
          setLoading(false);
        }
        return;
      }
      const data = await res.json();
      if (cancelled) return;
      setMatchLabel(data.match?.label ?? null);
      setEntries(data.entries ?? []);
      setError(null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold tracking-tight">Prediction Stat</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Pick a match to see every player&apos;s winner pick and bonus answers for that fixture
        (transparent view). Defaults to the next fixture that is not completed.
      </p>

      {matches === null ? (
        <p className="mb-4 text-sm text-muted-foreground">Loading matches…</p>
      ) : matches.length === 0 ? (
        <p className="mb-4 text-sm text-muted-foreground">No matches in the schedule.</p>
      ) : (
        <label className="mb-4 block text-sm">
          <span className="text-muted-foreground">Match</span>
          <select
            className="mt-1 w-full max-w-xl rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            value={matchId}
            onChange={(e) => setMatchId(e.target.value)}
          >
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {matchId && loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : null}

      {matchId && !loading && matchLabel ? (
        <div className="space-y-3">
          <p className="text-sm font-medium">{matchLabel}</p>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No predictions submitted for this match yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 font-medium">Player</th>
                    <th className="px-3 py-2 font-medium">Winner</th>
                    <th className="px-3 py-2 font-medium">Bonus</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.user_id} className="border-t border-border">
                      <td className="px-3 py-2 align-top">{e.display_name}</td>
                      <td className="px-3 py-2 align-top">{e.predicted_winner}</td>
                      <td className="px-3 py-2 align-top text-muted-foreground">
                        <ul className="list-inside list-disc space-y-1">
                          {e.bonus_answers.map((b) => (
                            <li key={b.prompt_id}>
                              <span className="text-foreground">{b.prompt_text}</span>: {b.answer_text}
                            </li>
                          ))}
                          {e.bonus_pick ? (
                            <li>
                              <span className="text-foreground">Legacy bonus</span>: {e.bonus_pick}
                            </li>
                          ) : null}
                          {e.bonus_answers.length === 0 && !e.bonus_pick ? (
                            <li className="list-none text-xs">—</li>
                          ) : null}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
