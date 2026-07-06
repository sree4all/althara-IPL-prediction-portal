import { MatchGrid } from "@/components/matches/match-grid";
import { UtcNowClock } from "@/components/matches/utc-now-clock";
import { PageHeader } from "@/components/layout/page-header";
import { ScheduleOnboardingPanel } from "@/components/onboarding/schedule-onboarding-panel";
import { defaultOnboardingItems } from "@/lib/data/onboarding-state";

export default function MatchesPage() {
  return (
    <div>
      <PageHeader
        title="Matches"
        description="Only open fixtures with both teams confirmed are listed (next three first; use See more for the rest). Predictions lock at match start time (IST)."
      />
      <ScheduleOnboardingPanel items={defaultOnboardingItems} />
      <UtcNowClock />
      <MatchGrid />
    </div>
  );
}
