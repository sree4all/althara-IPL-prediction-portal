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
        description="Only matches you can still predict on are listed (next three first; use See more for the rest). Predictions lock 30 minutes before start time (US Eastern)."
      />
      <ScheduleOnboardingPanel items={defaultOnboardingItems} />
      <UtcNowClock />
      <MatchGrid />
    </div>
  );
}
