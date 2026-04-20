"use client";

import { useEffect, useState } from "react";
import { MatchCard, type MatchApiRow } from "@/components/matches/match-card";
import { Button } from "@/components/ui/button";

const INITIAL_VISIBLE = 3;

export function MatchGrid() {
  const [matches, setMatches] = useState<MatchApiRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/matches");
      if (!res.ok) {
        if (!cancelled) setError("Could not load matches.");
        return;
      }
      const data = await res.json();
      if (!cancelled) {
        setMatches(data.matches ?? []);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p className="text-center text-sm text-destructive">{error}</p>;
  }
  if (!matches) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Loading matches…
      </p>
    );
  }
  if (matches.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        No upcoming matches right now. Fixtures lock 30 minutes before start; completed
        or locked games are not shown here.
      </p>
    );
  }

  const visible = showAll ? matches : matches.slice(0, INITIAL_VISIBLE);
  const hasMore = matches.length > INITIAL_VISIBLE;

  return (
    <div className="space-y-4">
      <ul className="flex flex-col gap-4">
        {visible.map((m) => (
          <li key={m.id}>
            <MatchCard match={m} />
          </li>
        ))}
      </ul>
      {hasMore && !showAll ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="secondary"
            className="w-full max-w-sm"
            onClick={() => setShowAll(true)}
          >
            See more matches ({matches.length - INITIAL_VISIBLE} more)
          </Button>
        </div>
      ) : null}
      {hasMore && showAll ? (
        <div className="flex justify-center">
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowAll(false)}>
            Show fewer
          </Button>
        </div>
      ) : null}
    </div>
  );
}
