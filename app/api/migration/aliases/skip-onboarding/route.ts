import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * One-time: mark legacy alias step done without claiming (new users with no old tally name).
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { data: prof, error: pErr } = await supabase
    .from("profiles")
    .select("legacy_alias_onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
  if (!prof) return NextResponse.json({ error: "PROFILE_NOT_FOUND" }, { status: 404 });
  if (prof.legacy_alias_onboarding_completed) {
    return NextResponse.json({ error: "ONBOARDING_ALREADY_COMPLETE" }, { status: 409 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ legacy_alias_onboarding_completed: true, updated_at: new Date().toISOString() })
    .eq("id", user.id)
    .eq("legacy_alias_onboarding_completed", false);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
