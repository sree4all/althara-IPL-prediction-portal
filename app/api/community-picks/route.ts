import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get("match_id");
  if (!matchId) return NextResponse.json({ error: "VALIDATION" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { data: picks } = await supabase
    .from("predictions")
    .select("predicted_winner, user_id")
    .eq("match_id", matchId);
  const userIds = (picks ?? []).map((p) => p.user_id);
  if (userIds.length === 0) {
    return NextResponse.json({ match_id: matchId, rows: [] });
  }
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", userIds);
  const map = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

  const rows = (picks ?? []).map((p) => ({
    user_display_name: map.get(p.user_id) ?? "Player",
    predicted_winner: p.predicted_winner,
  }));
  return NextResponse.json({ match_id: matchId, rows });
}

