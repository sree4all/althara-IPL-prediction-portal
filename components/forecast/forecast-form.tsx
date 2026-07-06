"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { finalHalfForGroup, sfGroupForTeam } from "@/lib/fifa/bracket-map";

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

export function ForecastForm() {
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [answers, setAnswers] = useState<Answers>({
    semi_finalist_teams: [],
    finalist_teams: [],
    winner_team: null,
  });
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
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const aliveSet = useMemo(
    () => new Set(eligibility?.eligible_teams ?? []),
    [eligibility],
  );

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

      <section>
        <h2 className="text-sm font-semibold">Semi-finalists (pick 4)</h2>
        <p className="text-xs text-muted-foreground">
          Bracket rules apply — only one team per Round of 16 path (e.g. Canada and Morocco cannot
          both be selected).
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {semiOptions.map((team) => {
            const selected = answers.semi_finalist_teams.includes(team);
            return (
              <Button
                key={team}
                type="button"
                size="sm"
                variant={selected ? "default" : "outline"}
                disabled={locked}
                onClick={() => toggleSemi(team)}
              >
                {team}
              </Button>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold">Finalists (pick 2 from your semi-finalists)</h2>
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
            return (
              <Button
                key={team}
                type="button"
                size="sm"
                variant={selected ? "default" : "outline"}
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
              </Button>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold">Winner</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {answers.finalist_teams.map((team) => (
            <Button
              key={team}
              type="button"
              size="sm"
              variant={answers.winner_team === team ? "default" : "outline"}
              disabled={locked || answers.finalist_teams.length < 2}
              onClick={() => setAnswers((p) => ({ ...p, winner_team: team }))}
            >
              {team}
            </Button>
          ))}
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
