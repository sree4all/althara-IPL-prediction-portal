"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { finalHalfForGroup, sfGroupForTeam } from "@/lib/fifa/bracket-map";
import { normAnswer } from "@/lib/scoring/normalize";
import type { ForecastScoringBreakdown } from "@/lib/scoring/forecast-scoring";

function finalHalfForTeam(team: string, aliveTeams: Set<string>): "left" | "right" | null {
  const groupId = sfGroupForTeam(team, aliveTeams);
  return groupId ? finalHalfForGroup(groupId) : null;
}

function isFinalistSelectable(
  team: string,
  selectedFinalists: string[],
  aliveTeams: Set<string>,
): boolean {
  if (selectedFinalists.includes(team)) return true;
  if (selectedFinalists.length >= 2) return false;
  const half = finalHalfForTeam(team, aliveTeams);
  if (!half) return false;
  return !selectedFinalists.some((t) => finalHalfForTeam(t, aliveTeams) === half);
}

type Eligibility = {
  locked: boolean;
  lock_at_utc: string | null;
  eligible_teams: string[];
  eliminated_teams: string[];
  sf_exclusion_groups: { group_id: string; teams: string[] }[];
  final_halves: { half_id: string; teams: string[] }[];
};

type Answers = {
  semi_finalist_teams: string[];
  finalist_teams: string[];
  winner_team: string | null;
};

function teamButtonClass(selected: boolean, isCorrect: boolean | null): string {
  if (isCorrect === true) return "border-emerald-500/60 bg-emerald-500/15";
  if (isCorrect === false && selected) return "border-muted-foreground/30 opacity-70";
  return "";
}

function ForecastPointsSummary({ scoring }: { scoring: ForecastScoringBreakdown }) {
  const { semi, finalist, winner, total_earned, total_max } = scoring.scoring;
  const hasAnyScored = semi.scored || finalist.scored || winner.scored;

  return (
    <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
      <p className="font-medium">Forecast scoring</p>
      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
        <li>
          Semi-finalists: <strong className="text-foreground">10 pts</strong> per correct team (max 40)
          {semi.scored ? (
            <span className="text-foreground">
              {" "}
              — {semi.earned}/{semi.max} earned
            </span>
          ) : null}
        </li>
        <li>
          Finalists: <strong className="text-foreground">15 pts</strong> per correct team (max 30)
          {finalist.scored ? (
            <span className="text-foreground">
              {" "}
              — {finalist.earned}/{finalist.max} earned
            </span>
          ) : null}
        </li>
        <li>
          Winner: <strong className="text-foreground">20 pts</strong>
          {winner.scored ? (
            <span className="text-foreground">
              {" "}
              — {winner.earned}/{winner.max} earned
            </span>
          ) : null}
        </li>
      </ul>
      {hasAnyScored ? (
        <p className="mt-2 text-sm font-semibold">
          Total: {total_earned} / {total_max} pts
        </p>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          Points are awarded as knockout results are recorded (max {total_max} pts).
        </p>
      )}
    </div>
  );
}

export function ForecastForm() {
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [answers, setAnswers] = useState<Answers>({
    semi_finalist_teams: [],
    finalist_teams: [],
    winner_team: null,
  });
  const [scoring, setScoring] = useState<ForecastScoringBreakdown | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [elRes, ansRes] = await Promise.all([
      fetch("/api/forecast/eligibility"),
      fetch("/api/forecast/answers"),
    ]);
    if (elRes.ok) setEligibility(await elRes.json());
    if (ansRes.ok) {
      const data = await ansRes.json();
      setAnswers({
        semi_finalist_teams: data.semi_finalist_teams ?? [],
        finalist_teams: data.finalist_teams ?? [],
        winner_team: data.winner_team ?? null,
      });
      if (data.scoring) setScoring(data.scoring as ForecastScoringBreakdown);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const aliveSet = useMemo(
    () => new Set(eligibility?.eligible_teams ?? []),
    [eligibility],
  );

  const correctSemiSet = useMemo(
    () => new Set((scoring?.scoring.semi.correct_teams ?? []).map(normAnswer)),
    [scoring],
  );
  const correctFinalistSet = useMemo(
    () => new Set((scoring?.scoring.finalist.correct_teams ?? []).map(normAnswer)),
    [scoring],
  );
  const actualSemiSet = useMemo(
    () => new Set((scoring?.actuals.semi_finalists ?? []).map(normAnswer)),
    [scoring],
  );
  const actualFinalistSet = useMemo(
    () => new Set((scoring?.actuals.finalists ?? []).map(normAnswer)),
    [scoring],
  );

  function semiCorrectness(team: string): boolean | null {
    if (!scoring?.scoring.semi.scored) return null;
    const selected = answers.semi_finalist_teams.includes(team);
    if (!selected) return null;
    return correctSemiSet.has(normAnswer(team));
  }

  function finalistCorrectness(team: string): boolean | null {
    if (!scoring?.scoring.finalist.scored) return null;
    const selected = answers.finalist_teams.includes(team);
    if (!selected) return null;
    return correctFinalistSet.has(normAnswer(team));
  }

  function winnerCorrectness(team: string): boolean | null {
    if (!scoring?.scoring.winner.scored) return null;
    if (answers.winner_team !== team) return null;
    return scoring.scoring.winner.correct;
  }

  function toggleSemi(team: string) {
    if (eligibility?.locked) return;
    setAnswers((prev) => {
      const cur = [...prev.semi_finalist_teams];
      const idx = cur.indexOf(team);
      if (idx >= 0) {
        cur.splice(idx, 1);
        return { ...prev, semi_finalist_teams: cur, finalist_teams: [], winner_team: null };
      }
      if (cur.length >= 4) return prev;
      const gid = sfGroupForTeam(team, aliveSet);
      if (!gid) return prev;
      const filtered = cur.filter((t) => sfGroupForTeam(t, aliveSet) !== gid);
      filtered.push(team);
      return {
        ...prev,
        semi_finalist_teams: filtered,
        finalist_teams: [],
        winner_team: null,
      };
    });
  }

  function toggleFinalist(team: string) {
    if (eligibility?.locked) return;
    setAnswers((prev) => {
      if (!prev.semi_finalist_teams.includes(team)) return prev;
      const cur = [...prev.finalist_teams];
      const idx = cur.indexOf(team);
      if (idx >= 0) {
        cur.splice(idx, 1);
        return { ...prev, finalist_teams: cur, winner_team: null };
      }
      if (!isFinalistSelectable(team, cur, aliveSet)) return prev;
      cur.push(team);
      return { ...prev, finalist_teams: cur, winner_team: null };
    });
  }

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/forecast/answers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Could not save forecast.");
        return;
      }
      if (data.scoring) setScoring(data.scoring as ForecastScoringBreakdown);
      toast.success("Tournament Forecast saved.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!eligibility) {
    return <p className="text-sm text-muted-foreground">Loading forecast…</p>;
  }

  const locked = eligibility.locked;
  const semiOptions = eligibility.eligible_teams;
  const semiFinalHalves = new Set(
    answers.semi_finalist_teams
      .map((team) => finalHalfForTeam(team, aliveSet))
      .filter((half): half is "left" | "right" => half != null),
  );
  const semiFinalistsSpanBothHalves = semiFinalHalves.size >= 2;

  return (
    <div className="space-y-6">
      {scoring ? <ForecastPointsSummary scoring={scoring} /> : null}

      {locked ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          Forecast locked at Round of 8 kickoff
          {eligibility.lock_at_utc ? ` (${new Date(eligibility.lock_at_utc).toLocaleString()})` : ""}.
        </p>
      ) : null}

      {eligibility.eliminated_teams.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Eliminated: {eligibility.eliminated_teams.join(", ")}
        </p>
      ) : null}

      {scoring?.scoring.semi.scored && scoring.actuals.semi_finalists.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Actual semi-finalists: {scoring.actuals.semi_finalists.join(", ")}
        </p>
      ) : null}
      {scoring?.scoring.finalist.scored && scoring.actuals.finalists.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Actual finalists: {scoring.actuals.finalists.join(", ")}
        </p>
      ) : null}
      {scoring?.scoring.winner.scored && scoring.actuals.winner ? (
        <p className="text-xs text-muted-foreground">Actual winner: {scoring.actuals.winner}</p>
      ) : null}

      <section>
        <h2 className="text-sm font-semibold">Semi-finalists (pick 4) · 10 pts each</h2>
        <p className="text-xs text-muted-foreground">
          Bracket rules apply — only one team per Round of 16 path (e.g. Canada and Morocco cannot
          both be selected).
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {semiOptions.map((team) => {
            const selected = answers.semi_finalist_teams.includes(team);
            const correctness = semiCorrectness(team);
            const actual = scoring?.scoring.semi.scored && actualSemiSet.has(normAnswer(team));
            return (
              <Button
                key={team}
                type="button"
                size="sm"
                variant={selected ? "default" : "outline"}
                className={teamButtonClass(selected, correctness)}
                disabled={locked}
                onClick={() => toggleSemi(team)}
              >
                {team}
                {actual && !selected ? " (actual)" : ""}
                {correctness === true ? " ✓" : correctness === false ? " ✗" : ""}
              </Button>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold">Finalists (pick 2) · 15 pts each</h2>
        <p className="text-xs text-muted-foreground">
          Finalists must come from opposite sides of the bracket — they must be able to meet in the
          final, not the same semi-final. For example, England and Argentina are both on the right
          side of the draw, so only one of them can be a finalist.
        </p>
        {answers.semi_finalist_teams.length === 4 && !semiFinalistsSpanBothHalves ? (
          <p className="mt-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
            All four semi-finalists are from the same side of the bracket. Change at least one
            semi-finalist pick to include a team from the other side before you can choose finalists.
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-2">
          {answers.semi_finalist_teams.map((team) => {
            const selected = answers.finalist_teams.includes(team);
            const half = finalHalfForTeam(team, aliveSet);
            const selectable =
              answers.semi_finalist_teams.length === 4 &&
              isFinalistSelectable(team, answers.finalist_teams, aliveSet);
            const blockedByHalf =
              answers.semi_finalist_teams.length === 4 &&
              !selected &&
              !selectable &&
              answers.finalist_teams.length > 0;
            const correctness = finalistCorrectness(team);
            const actual =
              scoring?.scoring.finalist.scored && actualFinalistSet.has(normAnswer(team));
            return (
              <Button
                key={team}
                type="button"
                size="sm"
                variant={selected ? "default" : "outline"}
                className={teamButtonClass(selected, correctness)}
                disabled={locked || answers.semi_finalist_teams.length < 4 || (!selected && !selectable)}
                title={
                  blockedByHalf
                    ? "Same bracket side as your other finalist — these teams would meet in a semi-final"
                    : half
                      ? `${half === "left" ? "Left" : "Right"} side of the draw`
                      : undefined
                }
                onClick={() => toggleFinalist(team)}
              >
                {team}
                {actual && !selected ? " (actual)" : ""}
                {correctness === true ? " ✓" : correctness === false ? " ✗" : ""}
              </Button>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold">Winner · 20 pts</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {answers.finalist_teams.map((team) => {
            const correctness = winnerCorrectness(team);
            return (
              <Button
                key={team}
                type="button"
                size="sm"
                variant={answers.winner_team === team ? "default" : "outline"}
                className={teamButtonClass(answers.winner_team === team, correctness)}
                disabled={locked || answers.finalist_teams.length < 2}
                onClick={() => setAnswers((p) => ({ ...p, winner_team: team }))}
              >
                {team}
                {correctness === true ? " ✓" : correctness === false ? " ✗" : ""}
              </Button>
            );
          })}
        </div>
      </section>

      {!locked ? (
        <Button
          type="button"
          disabled={
            busy ||
            answers.semi_finalist_teams.length !== 4 ||
            answers.finalist_teams.length !== 2 ||
            !answers.winner_team
          }
          onClick={() => void save()}
        >
          {busy ? "Saving…" : "Save forecast"}
        </Button>
      ) : null}
    </div>
  );
}
