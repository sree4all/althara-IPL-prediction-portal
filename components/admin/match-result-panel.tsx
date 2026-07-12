"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DRAW_PICK } from "@/lib/fifa/stages";
import { isDrawAllowedForMatch } from "@/lib/fifa/match-ready";
import { fixtureNumber } from "@/lib/matches/dedupe-by-match-number";
import { formatMatchLabelWithIst } from "@/lib/matches/match-display-label";

export type AdminMatchRow = {
  id: string;
  external_key: string | null;
  match_number?: number | null;
  home_team: string;
  away_team: string;
  match_time_utc: string;
  status: string;
  winner: string | null;
  bonus_result: string | null;
  scored_at: string | null;
  tournament_stage?: string | null;
};

type MatchBonusPromptOption = {
  id: string;
  label: string;
  value: string;
  sort_order: number;
};

type MatchBonusPrompt = {
  id: string;
  prompt_text: string;
  prompt_key: string;
  correct_answer?: string | null;
  options?: MatchBonusPromptOption[];
};

function label(m: AdminMatchRow) {
  return formatMatchLabelWithIst(m.home_team, m.away_team, m.match_time_utc);
}

export function MatchResultPanel({ matches }: { matches: AdminMatchRow[] }) {
  const unscoredMatches = matches.filter((m) => !m.scored_at);
  const [matchId, setMatchId] = useState("");
  const [winner, setWinner] = useState("");
  const [legacyBonus, setLegacyBonus] = useState("");
  const [matchPrompts, setMatchPrompts] = useState<MatchBonusPrompt[]>([]);
  const [promptResults, setPromptResults] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selected = unscoredMatches.find((m) => m.id === matchId);
  const drawAllowed = selected
    ? isDrawAllowedForMatch(fixtureNumber(selected), selected.tournament_stage)
    : true;

  useEffect(() => {
    if (!drawAllowed && winner === DRAW_PICK) {
      setWinner("");
    }
  }, [drawAllowed, winner]);

  useEffect(() => {
    if (!matchId) {
      setMatchPrompts([]);
      setPromptResults({});
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await fetch(
        `/api/admin/bonus-prompts?match_id=${encodeURIComponent(matchId)}`,
      );
      if (!res.ok) return;
      const data = await res.json();
      const list = (data.prompts ?? []) as MatchBonusPrompt[];
      if (cancelled) return;
      setMatchPrompts(list);
      const init: Record<string, string> = {};
      for (const p of list) {
        const ca = p.correct_answer;
        init[p.id] = ca == null || ca === undefined ? "" : String(ca);
      }
      setPromptResults(init);
    })();
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  function pickWinner(team: string) {
    setWinner(team);
  }

  async function apply() {
    setMsg(null);
    if (!selected || !winner) {
      setMsg("Select a match and winning team.");
      return;
    }
    const valid =
      (drawAllowed && winner === DRAW_PICK) ||
      winner === selected.home_team ||
      winner === selected.away_team;
    if (!valid) {
      setMsg(
        drawAllowed
          ? "Result must be home team, away team, or Draw."
          : "Result must be home team or away team.",
      );
      return;
    }
    setBusy(true);
    const body: {
      winner: string;
      bonus_result?: string | null;
      bonus_prompt_results?: { prompt_id: string; correct_answer: string | null }[];
    } = { winner };
    if (matchPrompts.length > 0) {
      body.bonus_prompt_results = matchPrompts.map((p) => ({
        prompt_id: p.id,
        correct_answer: (promptResults[p.id] ?? "").trim() || null,
      }));
    } else {
      body.bonus_result = legacyBonus.trim() || null;
    }
    const res = await fetch(`/api/admin/matches/${selected.id}/apply-result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      const err = data.error ?? "Request failed";
      setMsg(err);
      toast.error(String(err));
      return;
    }
    const summary =
      (data as { message?: string }).message ??
      `Scored. Ledger rows written: ${data.ledger_rows ?? 0}.`;
    const propagation = (data as { propagation?: { updated?: { match_number: number; slot: string; team: string }[]; conflicts?: unknown[] } }).propagation;
    const propLines = (propagation?.updated ?? []).map(
      (u) => `M${u.match_number} ${u.slot} ← ${u.team}`,
    );
    const fullSummary =
      propLines.length > 0
        ? `${summary} Bracket: ${propLines.join("; ")}.`
        : propagation?.conflicts?.length
          ? `${summary} Bracket conflicts — check admin logs.`
          : summary;
    setMsg(fullSummary);
    toast.success(fullSummary);
  }

  return (
    <div className="rounded-md border border-border p-3">
      <p className="mb-2 text-sm font-semibold">Complete match &amp; score</p>
      <p className="mb-3 text-xs text-muted-foreground">
        Sets status to completed, stores the official winner and bonus answers (one per match bonus
        question, loaded from your Bonus prompts), then writes points to the ledger. The winner is
        automatically placed into the next-round fixture (e.g. M92 winner → M99 away). Re-running
        replaces previous ledger rows for this match.
      </p>
      {msg ? <p className="mb-2 text-xs text-muted-foreground">{msg}</p> : null}
      <label className="block text-xs text-muted-foreground">
        Match
        <select
          className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          value={matchId}
          onChange={(e) => {
            setMatchId(e.target.value);
            const m = unscoredMatches.find((x) => x.id === e.target.value);
            setWinner(m?.winner ?? "");
            setLegacyBonus(m?.bonus_result ?? "");
          }}
        >
          <option value="">Select…</option>
          {unscoredMatches.map((m) => (
            <option key={m.id} value={m.id}>
              {label(m)} — {m.status}
            </option>
          ))}
        </select>
      </label>
      {selected ? (
        <div className="mt-3 space-y-3">
          <p className="text-xs font-medium">Match result</p>
          <div className="flex flex-wrap gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="win"
                checked={winner === selected.home_team}
                onChange={() => pickWinner(selected.home_team)}
              />
              {selected.home_team}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="win"
                checked={winner === selected.away_team}
                onChange={() => pickWinner(selected.away_team)}
              />
              {selected.away_team}
            </label>
            {drawAllowed ? (
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="win"
                  checked={winner === DRAW_PICK}
                  onChange={() => pickWinner(DRAW_PICK)}
                />
                Draw
              </label>
            ) : null}
          </div>

          {matchPrompts.length > 0 ? (
            <div className="space-y-2 border-t border-border pt-3">
              <p className="text-xs font-medium text-foreground">
                Official bonus answers (one per question — values must match player picks after trim)
              </p>
              {matchPrompts.map((p) => (
                <label key={p.id} className="block text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{p.prompt_text}</span>
                  <span className="ml-1 text-[10px] opacity-70">({p.prompt_key})</span>
                  {(p.options?.length ?? 0) > 0 ? (
                    <select
                      className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                      value={promptResults[p.id] ?? ""}
                      onChange={(e) =>
                        setPromptResults((prev) => ({ ...prev, [p.id]: e.target.value }))
                      }
                    >
                      <option value="">No answer — skips points for this question</option>
                      {p.options!.map((o) => (
                        <option key={o.id} value={o.value}>
                          {o.label} ({o.value})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="mt-1 w-full rounded-md border border-input px-2 py-1 text-sm"
                      value={promptResults[p.id] ?? ""}
                      onChange={(e) =>
                        setPromptResults((prev) => ({ ...prev, [p.id]: e.target.value }))
                      }
                      placeholder="e.g. option value or letter — empty skips points for this question"
                    />
                  )}
                </label>
              ))}
            </div>
          ) : (
            <label className="block text-xs text-muted-foreground">
              Official bonus result (optional — use when this match has no per-match bonus questions;
              e.g. letter; must match player picks after trim)
              <input
                className="mt-1 w-full rounded-md border border-input px-2 py-1 text-sm"
                value={legacyBonus}
                onChange={(e) => setLegacyBonus(e.target.value)}
                placeholder="Leave empty if no bonus for this match"
              />
            </label>
          )}

          <Button type="button" size="sm" onClick={apply} disabled={busy}>
            Save result &amp; apply scoring
          </Button>
        </div>
      ) : null}
    </div>
  );
}
