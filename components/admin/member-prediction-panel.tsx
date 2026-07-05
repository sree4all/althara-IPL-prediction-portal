"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DRAW_PICK } from "@/lib/fifa/stages";
import {
  allowedWinnerPicks,
  isDrawAllowedForMatch,
  isMatchReadyForPredictions,
} from "@/lib/fifa/match-ready";
import { fixtureNumber } from "@/lib/matches/dedupe-by-match-number";
import { formatMatchLabelWithIst } from "@/lib/matches/match-display-label";
import { isMatchLocked } from "@/lib/utils/match-lock";
import type { AdminMatchRow } from "@/components/admin/match-result-panel";

type ProfileOption = {
  id: string;
  display_name: string;
  email: string | null;
};

type MatchDraft = {
  userId: string;
  winner: string;
  loadingPrediction: boolean;
  saving: boolean;
};

const EMPTY_DRAFT: MatchDraft = {
  userId: "",
  winner: "",
  loadingPrediction: false,
  saving: false,
};

function matchLabel(m: AdminMatchRow) {
  return formatMatchLabelWithIst(m.home_team, m.away_team, m.match_time_utc);
}

function isOpenForPredictions(m: AdminMatchRow, now = new Date()) {
  if (
    m.status === "completed" ||
    m.status === "abandoned" ||
    m.status === "cancelled"
  ) {
    return false;
  }
  if (!isMatchReadyForPredictions(m.home_team, m.away_team)) return false;
  return !isMatchLocked(new Date(m.match_time_utc), now);
}

export function MemberPredictionPanel({ matches }: { matches: AdminMatchRow[] }) {
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, MatchDraft>>({});

  const openMatches = useMemo(
    () => matches.filter((m) => isOpenForPredictions(m)),
    [matches],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setProfilesLoading(true);
      const res = await fetch("/api/admin/profiles");
      const data = await res.json().catch(() => ({}));
      if (cancelled) return;
      setProfilesLoading(false);
      if (!res.ok) {
        toast.error(String(data.error ?? "Failed to load members"));
        return;
      }
      setProfiles((data.profiles ?? []) as ProfileOption[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function updateDraft(matchId: string, patch: Partial<MatchDraft>) {
    setDrafts((prev) => ({
      ...prev,
      [matchId]: {
        ...EMPTY_DRAFT,
        ...prev[matchId],
        ...patch,
      },
    }));
  }

  async function onMemberChange(match: AdminMatchRow, userId: string) {
    const allowed = allowedWinnerPicks(
      match.home_team,
      match.away_team,
      fixtureNumber(match),
      match.tournament_stage,
    );
    const defaultWinner = allowed[0] ?? match.home_team;

    if (!userId) {
      updateDraft(match.id, { userId: "", winner: "" });
      return;
    }

    updateDraft(match.id, {
      userId,
      winner: defaultWinner,
      loadingPrediction: true,
    });

    const res = await fetch(
      `/api/admin/predictions?user_id=${encodeURIComponent(userId)}&match_id=${encodeURIComponent(match.id)}`,
    );
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      updateDraft(match.id, { loadingPrediction: false });
      toast.error(String(data.error ?? "Failed to load prediction"));
      return;
    }

    const existing = data.prediction?.predicted_winner as string | undefined;
    const winner =
      existing && allowed.includes(existing) ? existing : defaultWinner;

    updateDraft(match.id, { winner, loadingPrediction: false });
  }

  async function savePrediction(match: AdminMatchRow) {
    const draft = drafts[match.id];
    if (!draft?.userId || !draft.winner) {
      toast.error("Select a member and prediction.");
      return;
    }

    updateDraft(match.id, { saving: true });
    const res = await fetch("/api/admin/predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: draft.userId,
        match_id: match.id,
        predicted_winner: draft.winner,
      }),
    });
    const data = await res.json().catch(() => ({}));
    updateDraft(match.id, { saving: false });

    if (!res.ok) {
      toast.error(String(data.message ?? data.error ?? "Save failed"));
      return;
    }

    const member = profiles.find((p) => p.id === draft.userId);
    const action = data.was_update ? "updated" : "saved";
    toast.success(
      `${member?.display_name ?? "Member"}: prediction ${action} for ${matchLabel(match)}.`,
    );
  }

  if (profilesLoading) {
    return (
      <div className="rounded-md border border-border p-3 text-sm text-muted-foreground">
        Loading members…
      </div>
    );
  }

  if (openMatches.length === 0) {
    return (
      <div className="rounded-md border border-border p-3">
        <p className="text-sm font-semibold">Member predictions</p>
        <p className="mt-2 text-xs text-muted-foreground">
          No open matches right now. Predictions can only be added or updated before kickoff.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border p-3">
      <p className="mb-1 text-sm font-semibold">Member predictions</p>
      <p className="mb-3 text-xs text-muted-foreground">
        Add or update any member&apos;s match-winner pick before kickoff lock. Select a member per
        match, choose their prediction, then save.
      </p>

      <div className="max-h-[32rem] space-y-3 overflow-y-auto pr-1">
        {openMatches.map((match) => {
          const draft = drafts[match.id];
          const drawAllowed = isDrawAllowedForMatch(
            fixtureNumber(match),
            match.tournament_stage,
          );
          const allowed = allowedWinnerPicks(
            match.home_team,
            match.away_team,
            fixtureNumber(match),
            match.tournament_stage,
          );

          return (
            <div
              key={match.id}
              className="rounded-md border border-border/80 bg-background/40 p-3"
            >
              <p className="text-sm font-medium">{matchLabel(match)}</p>
              <p className="mb-2 text-[11px] text-muted-foreground">
                {match.home_team} vs {match.away_team} · locks at kickoff (IST)
              </p>

              <label className="block text-xs text-muted-foreground">
                Member
                <select
                  className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                  value={draft?.userId ?? ""}
                  disabled={draft?.loadingPrediction || draft?.saving}
                  onChange={(e) => onMemberChange(match, e.target.value)}
                >
                  <option value="">Select member…</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.display_name}
                      {p.email ? ` (${p.email})` : ""}
                    </option>
                  ))}
                </select>
              </label>

              {draft?.userId ? (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-medium">
                    Prediction
                    {draft.loadingPrediction ? (
                      <span className="ml-2 font-normal text-muted-foreground">Loading…</span>
                    ) : null}
                  </p>
                  <div className="flex flex-wrap gap-3 text-sm">
                    {allowed.map((pick) => (
                      <label key={pick} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`admin-pick-${match.id}`}
                          checked={draft.winner === pick}
                          disabled={draft.loadingPrediction || draft.saving}
                          onChange={() => updateDraft(match.id, { winner: pick })}
                        />
                        {pick === DRAW_PICK ? "Draw" : pick}
                      </label>
                    ))}
                  </div>
                  {!drawAllowed && draft.winner === DRAW_PICK ? (
                    <p className="text-xs text-destructive">Draw is not allowed for this match.</p>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    disabled={draft.loadingPrediction || draft.saving || !draft.winner}
                    onClick={() => savePrediction(match)}
                  >
                    {draft.saving ? "Saving…" : "Save prediction"}
                  </Button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
