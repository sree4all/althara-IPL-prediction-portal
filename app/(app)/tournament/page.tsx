import { SeasonBonusesShell } from "@/components/tournament/season-bonuses-shell";

export default function TournamentPage() {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold tracking-tight">Mega Bonus</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Season-long picks apply across the tournament. They are not tied to a single fixture. Match-day
        bonus questions stay on the Matches page for each game.
      </p>
      <SeasonBonusesShell />
    </div>
  );
}
