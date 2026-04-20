import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { data: prof } = await supabase
    .from("profiles")
    .select("legacy_alias_onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();
  if (prof?.legacy_alias_onboarding_completed) {
    return NextResponse.json({ aliases: [] });
  }

  const { data } = await supabase
    .from("legacy_aliases")
    .select("id, season_label, legacy_name")
    .is("claimed_by_user_id", null)
    .order("legacy_name", { ascending: true });
  return NextResponse.json({ aliases: data ?? [] });
}

