import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PredictionForm } from "@/components/matches/prediction-form";
import { formatIstDateTime } from "@/lib/utils/time-format";

export type MatchApiRow = {
  id: string;
  label: string;
  home_team: string;
  away_team: string;
  match_time_utc: string;
  status: string;
  client_lock_hint: boolean;
  winner: string | null;
  has_prediction?: boolean;
  predicted_winner?: string | null;
};

type Props = {
  match: MatchApiRow;
};

export function MatchCard({ match }: Props) {
  const locked = match.client_lock_hint;
  const timeLabel = formatIstDateTime(match.match_time_utc);

  return (
    <Card className={locked ? "opacity-90" : ""}>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold leading-tight">
            {match.label}
          </CardTitle>
          {locked ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Locked
            </span>
          ) : (
            <div className="flex flex-wrap gap-1">
              <span className="rounded-full bg-green-600/15 px-2 py-0.5 text-xs font-semibold text-green-700 dark:text-green-400">
                Open
              </span>
              {match.has_prediction ? (
                <span className="rounded-full bg-green-600/15 px-2 py-0.5 text-xs font-semibold text-green-700 dark:text-green-400">
                  Already Predicted
                </span>
              ) : (
                <span className="rounded-full bg-red-600/15 px-2 py-0.5 text-xs font-semibold text-red-700 dark:text-red-400">
                  Prediction Due
                </span>
              )}
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Start (IST): {timeLabel}</p>
      </CardHeader>
      <CardContent>
        {match.winner ? (
          <p className="text-sm text-muted-foreground">Result: {match.winner}</p>
        ) : null}
        <PredictionForm
          matchId={match.id}
          homeTeam={match.home_team}
          awayTeam={match.away_team}
          locked={locked}
          matchLabel={match.label}
          initialWinner={match.predicted_winner}
        />
      </CardContent>
    </Card>
  );
}
