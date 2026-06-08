import { SeasonBonusesShell } from "@/components/tournament/season-bonuses-shell";
import { PageHeader } from "@/components/layout/page-header";

export default function TournamentPage() {
  return (
    <div>
      <PageHeader
        title="Mega Bonus"
        description="Season-long picks apply across the tournament. They are not tied to a single fixture. Match-day bonus questions stay on the Matches page for each game."
      />
      <SeasonBonusesShell />
    </div>
  );
}
