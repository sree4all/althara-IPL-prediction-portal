import Link from "next/link";
import { ForecastForm } from "@/components/forecast/forecast-form";
import { fetchTournamentConfig2026 } from "@/lib/data/tournament-config";
import { createClient } from "@/lib/supabase/server";

export default async function ForecastPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let showPicksLink = false;
  if (user) {
    const [{ data: profile }, { data: cfg }] = await Promise.all([
      supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
      fetchTournamentConfig2026(supabase),
    ]);
    showPicksLink = profile?.role === "admin" || Boolean(cfg?.forecast_stats_visible);
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold">Tournament Forecast</h1>
          <p className="text-sm text-muted-foreground">
            Predict the two finalists and the winner. Edits lock Tuesday, 14 July 2026 at 3:00 PM ET
            (before the France vs Spain semi-final). Scoring: 15 pts per correct finalist (max 30),
            20 pts for the correct winner.
          </p>
        </div>
        {showPicksLink ? (
          <Link href="/forecast/stats" className="shrink-0 text-sm text-primary underline">
            All picks
          </Link>
        ) : null}
      </div>
      <ForecastForm />
    </main>
  );
}
