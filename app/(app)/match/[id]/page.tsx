import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CommunityPicksList } from "@/components/matches/community-picks-list";
import { PageHeader } from "@/components/layout/page-header";
import { isMatchReadyForPredictions } from "@/lib/fifa/match-ready";
import { formatIstDateTimeFriendly } from "@/lib/utils/time-format";

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: match } = await supabase
    .from("matches")
    .select("home_team, away_team, match_time_utc")
    .eq("id", id)
    .maybeSingle();

  if (
    !match ||
    !isMatchReadyForPredictions(match.home_team as string, match.away_team as string)
  ) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={`${match.home_team} vs ${match.away_team}`}
        description={`Start: ${formatIstDateTimeFriendly(match.match_time_utc)}`}
      />
      <CommunityPicksList matchId={id} />
    </div>
  );
}
