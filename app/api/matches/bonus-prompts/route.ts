import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBonusPromptsForMatch } from "@/lib/data/mvp2-repositories";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get("match_id");
  if (!matchId) {
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const prompts = await getBonusPromptsForMatch(supabase, matchId, 2026);
  const { data: answers, error: answersError } = await supabase
    .from("prediction_bonus_answers")
    .select("prompt_id, answer_text")
    .eq("user_id", user.id)
    .eq("match_id", matchId);

  if (answersError) {
    return NextResponse.json({ error: answersError.message }, { status: 500 });
  }

  return NextResponse.json({ match_id: matchId, prompts, answers: answers ?? [] });
}
