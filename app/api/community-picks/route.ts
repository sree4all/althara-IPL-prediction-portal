import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveMatchAliasIds } from "@/lib/matches/resolve-alias-ids";
import { shouldRevealAllPicks } from "@/lib/matches/picks-reveal-gate";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get("match_id");
  if (!matchId) return NextResponse.json({ error: "VALIDATION" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const isAdmin = profile?.role === "admin";

  const { data: match } = await supabase
    .from("matches")
    .select("match_time_utc")
    .eq("id", matchId)
    .maybeSingle();
  if (!match) return NextResponse.json({ error: "MATCH_NOT_FOUND" }, { status: 404 });

  const kickoffUtc = match.match_time_utc as string;
  const picksRevealed = shouldRevealAllPicks(kickoffUtc, isAdmin);

  const aliasMatchIds = await resolveMatchAliasIds(supabase, matchId);

  const { data: rawPicks } = await supabase
    .from("predictions")
    .select("predicted_winner, user_id, match_id")
    .in("match_id", aliasMatchIds);

  const picksByUser = new Map<string, { predicted_winner: string; user_id: string }>();
  for (const p of rawPicks ?? []) {
    const uid = p.user_id as string;
    const existing = picksByUser.get(uid);
    if (!existing || p.match_id === matchId) {
      picksByUser.set(uid, {
        user_id: uid,
        predicted_winner: p.predicted_winner as string,
      });
    }
  }
  let picks = [...picksByUser.values()];
  if (!picksRevealed) {
    picks = picks.filter((p) => p.user_id === user.id);
  }

  const userIds = picks.map((p) => p.user_id);
  if (userIds.length === 0) {
    return NextResponse.json({
      match_id: matchId,
      kickoff_utc: kickoffUtc,
      picks_revealed: picksRevealed,
      rows: [],
    });
  }
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", userIds);
  const map = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

  const rows = picks.map((p) => ({
    user_display_name: map.get(p.user_id) ?? "Player",
    predicted_winner: p.predicted_winner,
  }));
  return NextResponse.json({
    match_id: matchId,
    kickoff_utc: kickoffUtc,
    picks_revealed: picksRevealed,
    rows,
  });
}
