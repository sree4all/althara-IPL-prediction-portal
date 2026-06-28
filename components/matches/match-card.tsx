import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { PredictionForm } from "@/components/matches/prediction-form";

import { formatIstDateTimeFriendly } from "@/lib/utils/time-format";



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

  tournament_stage?: string | null;

  teams_pending?: boolean;

  draw_allowed?: boolean;

  stage_scoring_hint?: string | null;

};



type Props = {

  match: MatchApiRow;

};



export function MatchCard({ match }: Props) {

  const teamsPending = Boolean(match.teams_pending);

  const locked = match.client_lock_hint;

  const timeLabel = formatIstDateTimeFriendly(match.match_time_utc);



  return (

    <Card className={locked ? "opacity-85" : ""}>

      <div className="wc-scoreboard-strip" aria-hidden />

      <CardHeader className="pb-2">

        <div className="flex flex-wrap items-start justify-between gap-2">

          <CardTitle className="text-base font-bold leading-tight text-white">

            {match.label}

          </CardTitle>

          {teamsPending ? (

            <span className="rounded-full bg-wc-orange/20 px-2.5 py-0.5 text-xs font-semibold text-wc-orange">

              Teams pending

            </span>

          ) : locked ? (

            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-white/50">

              Locked

            </span>

          ) : (

            <div className="flex flex-wrap gap-1">

              <span className="rounded-full bg-wc-green/20 px-2.5 py-0.5 text-xs font-semibold text-wc-green">

                Open

              </span>

              {match.has_prediction ? (

                <span className="rounded-full bg-wc-green/20 px-2.5 py-0.5 text-xs font-semibold text-wc-green">

                  Already Predicted

                </span>

              ) : (

                <span className="rounded-full bg-wc-red/20 px-2.5 py-0.5 text-xs font-semibold text-wc-red">

                  Prediction Due

                </span>

              )}

            </div>

          )}

        </div>

        <p className="text-xs text-white/55">Start: {timeLabel}</p>

        {match.stage_scoring_hint ? (

          <p className="text-xs text-wc-yellow/80">{match.stage_scoring_hint}</p>

        ) : null}

      </CardHeader>

      <CardContent>

        {teamsPending ? (

          <p className="text-sm text-white/60">

            Teams for this fixture are not confirmed yet. Check back when both sides are known.

          </p>

        ) : null}

        {match.winner ? (

          <p className="text-sm font-medium text-wc-green">

            Result: {match.winner}

          </p>

        ) : null}

        <PredictionForm

          matchId={match.id}

          homeTeam={match.home_team}

          awayTeam={match.away_team}

          locked={locked}

          matchLabel={match.label}

          initialWinner={match.predicted_winner}

          teamsPending={teamsPending}

          drawAllowed={match.draw_allowed !== false}

        />

      </CardContent>

    </Card>

  );

}


