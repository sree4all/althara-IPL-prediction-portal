import { createClient } from "@/lib/supabase/server";
import { CommunityPicksList } from "@/components/matches/community-picks-list";
import { PageHeader } from "@/components/layout/page-header";
import { formatEasternDateTime } from "@/lib/utils/eastern-time";

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

  return (
    <div className="space-y-4">
      <PageHeader
        title={`${match?.home_team ?? "—"} vs ${match?.away_team ?? "—"}`}
        description={`Start: ${match?.match_time_utc ? formatEasternDateTime(match.match_time_utc) : "—"}`}
      />
      <CommunityPicksList matchId={id} />
    </div>
  );
}

