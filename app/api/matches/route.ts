import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isMatchLocked } from "@/lib/utils/match-lock";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { data: matches, error } = await supabase
    .from("matches")
    .select(
      "id, external_key, home_team, away_team, match_time_utc, status, winner",
    )
    .order("match_time_utc", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const serverTimeUtc = new Date().toISOString();
  const now = new Date();

  // Matches list is prediction UX only: hide locked / past-deadline fixtures (see isMatchLocked).
  const openWindow = (matches ?? []).filter(
    (m) => !isMatchLocked(new Date(m.match_time_utc as string), now),
  );

  const payload = openWindow.map((m) => {
    const matchTimeUtc = new Date(m.match_time_utc as string);
    const locked = isMatchLocked(matchTimeUtc, now);
    const label = m.external_key
      ? `${m.external_key} — ${m.home_team} vs ${m.away_team}`
      : `${m.home_team} vs ${m.away_team}`;
    return {
      id: m.id,
      label,
      home_team: m.home_team,
      away_team: m.away_team,
      match_time_utc: m.match_time_utc,
      status: m.status,
      client_lock_hint: locked,
      winner: m.winner,
    };
  });

  return NextResponse.json({
    matches: payload,
    server_time_utc: serverTimeUtc,
  });
}
