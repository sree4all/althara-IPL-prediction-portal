import { MatchGrid } from "@/components/matches/match-grid";
import { UtcNowClock } from "@/components/matches/utc-now-clock";
import { ScheduleOnboardingPanel } from "@/components/onboarding/schedule-onboarding-panel";
import { defaultOnboardingItems } from "@/lib/data/onboarding-state";

export default function MatchesPage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Matches</h1>
      <ScheduleOnboardingPanel items={defaultOnboardingItems} />
      <UtcNowClock />
      <p className="mb-6 text-sm text-muted-foreground">
        Only matches you can still predict on are listed (next three first; use See more for the
        rest). Predictions lock 30 minutes before start time (IST).
      </p>
      <MatchGrid />
    </div>
  );
}
