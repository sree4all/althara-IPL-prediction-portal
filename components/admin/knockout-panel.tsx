"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatIstDateTime } from "@/lib/utils/time-format";

type KnockoutMatch = {
  id: string;
  external_key: string | null;
  home_team: string;
  away_team: string;
  match_time_utc: string;
  status: string;
  winner: string | null;
  scored_at: string | null;
  knockout_stage: string | null;
  stage_label: string | null;
  scoring_hint: string | null;
  teams_ready: boolean;
};

export function KnockoutPanel() {
  const [matches, setMatches] = useState<KnockoutMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [team1, setTeam1] = useState("");
  const [team2, setTeam2] = useState("");
  const [team3, setTeam3] = useState("");
  const [team4, setTeam4] = useState("");
  const [savingSeeds, setSavingSeeds] = useState(false);
  const [scoreMatchId, setScoreMatchId] = useState("");
  const [scoreWinner, setScoreWinner] = useState("");
  const [scoring, setScoring] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/knockout");
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = await res.json();
    setMatches(data.matches ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const q1 = matches.find((m) => m.knockout_stage === "q1");
  const unscored = matches.filter((m) => !m.scored_at);
  const selectedScore = unscored.find((m) => m.id === scoreMatchId);

  async function saveSeeds() {
    setSavingSeeds(true);
    setMsg(null);
    const res = await fetch("/api/admin/knockout", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        team_1: team1,
        team_2: team2,
        team_3: team3,
        team_4: team4,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSavingSeeds(false);
    if (!res.ok) {
      const err = data.error ?? "Could not save teams";
      setMsg(err);
      toast.error(String(err));
      return;
    }
    toast.success(data.message ?? "Knockout teams saved.");
    setMsg(data.message ?? null);
    await load();
  }

  async function applyKnockoutResult() {
    if (!selectedScore || !scoreWinner) {
      setMsg("Select a knockout match and winning team.");
      return;
    }
    setScoring(true);
    setMsg(null);
    const res = await fetch(`/api/admin/matches/${selectedScore.id}/apply-result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ winner: scoreWinner }),
    });
    const data = await res.json().catch(() => ({}));
    setScoring(false);
    if (!res.ok) {
      const err = data.error ?? "Scoring failed";
      setMsg(err);
      toast.error(String(err));
      return;
    }
    const summary = data.message ?? "Knockout match scored.";
    setMsg(summary);
    toast.success(summary);
    setScoreMatchId("");
    setScoreWinner("");
    await load();
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading knockout fixtures…</p>;
  }

  if (matches.length === 0) {
    return (
      <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
        No knockout matches (M71–M74) in the database. Run migration{" "}
        <code className="text-xs">0026_knockout_matches</code> via{" "}
        <code className="text-xs">npm run db:push</code>.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-md border border-border p-3">
      <div>
        <p className="text-sm font-semibold">Knockout phase (M71–M74)</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Set Teams 1–4 before Qualifier 1 and Eliminator. After each result, the next
          fixture names update automatically (Q2 and Final). Knockout scoring applies on save
          (+3/−1 for Q1, Eliminator, Q2; +5/−2 for Final). No bonus questions on these matches.
        </p>
      </div>

      <div className="rounded-md border border-dashed border-border bg-muted/30 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Step 1 — League positions (Teams 1–4)
        </p>
        <p className="mb-3 text-xs text-muted-foreground">
          Team 1 vs Team 2 → Qualifier 1 (M71). Team 3 vs Team 4 → Eliminator (M72).
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-xs">
            Team 1 (3rd on table)
            <input
              className="mt-1 w-full rounded-md border border-input px-2 py-1 text-sm"
              value={team1}
              onChange={(e) => setTeam1(e.target.value)}
              placeholder={q1?.home_team ?? "e.g. RCB"}
            />
          </label>
          <label className="text-xs">
            Team 2 (4th on table)
            <input
              className="mt-1 w-full rounded-md border border-input px-2 py-1 text-sm"
              value={team2}
              onChange={(e) => setTeam2(e.target.value)}
              placeholder={q1?.away_team ?? "e.g. MI"}
            />
          </label>
          <label className="text-xs">
            Team 3 (5th on table)
            <input
              className="mt-1 w-full rounded-md border border-input px-2 py-1 text-sm"
              value={team3}
              onChange={(e) => setTeam3(e.target.value)}
              placeholder="e.g. CSK"
            />
          </label>
          <label className="text-xs">
            Team 4 (6th on table)
            <input
              className="mt-1 w-full rounded-md border border-input px-2 py-1 text-sm"
              value={team4}
              onChange={(e) => setTeam4(e.target.value)}
              placeholder="e.g. KKR"
            />
          </label>
        </div>
        <Button
          type="button"
          size="sm"
          className="mt-3"
          disabled={savingSeeds || !team1.trim() || !team2.trim() || !team3.trim() || !team4.trim()}
          onClick={saveSeeds}
        >
          Save Teams 1–4 to M71 &amp; M72
        </Button>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Bracket (read-only — updates after you score)
        </p>
        <ul className="space-y-2 text-sm">
          {matches.map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-border px-2 py-1.5"
            >
              <span>
                <span className="font-medium">{m.external_key}</span> — {m.stage_label}:{" "}
                {m.home_team} vs {m.away_team}
              </span>
              <span className="text-xs text-muted-foreground">
                {m.scored_at ? `Done · ${m.winner}` : m.teams_ready ? "Open for picks" : "Teams pending"}
                {" · "}
                {formatIstDateTime(m.match_time_utc)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-md border border-dashed border-border p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Step 2 — Score knockout match
        </p>
        {msg ? <p className="mb-2 text-xs text-muted-foreground">{msg}</p> : null}
        <label className="block text-xs text-muted-foreground">
          Match
          <select
            className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            value={scoreMatchId}
            onChange={(e) => {
              setScoreMatchId(e.target.value);
              const m = unscored.find((x) => x.id === e.target.value);
              setScoreWinner(m?.winner ?? "");
            }}
          >
            <option value="">Select…</option>
            {unscored.map((m) => (
              <option key={m.id} value={m.id}>
                {m.external_key} — {m.stage_label} ({m.home_team} vs {m.away_team})
              </option>
            ))}
          </select>
        </label>
        {selectedScore ? (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-muted-foreground">{selectedScore.scoring_hint}</p>
            <p className="text-xs font-medium">Winning team</p>
            <div className="flex flex-wrap gap-3 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="ko-win"
                  checked={scoreWinner === selectedScore.home_team}
                  onChange={() => setScoreWinner(selectedScore.home_team)}
                />
                {selectedScore.home_team}
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="ko-win"
                  checked={scoreWinner === selectedScore.away_team}
                  onChange={() => setScoreWinner(selectedScore.away_team)}
                />
                {selectedScore.away_team}
              </label>
            </div>
            <Button type="button" size="sm" disabled={scoring || !scoreWinner} onClick={applyKnockoutResult}>
              Save result, apply Knockout scoring &amp; advance bracket
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
