import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { alias_id?: string } | null;
  if (!body?.alias_id) return NextResponse.json({ error: "VALIDATION" }, { status: 400 });

  const { data: prof } = await supabase
    .from("profiles")
    .select("legacy_alias_onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();
  if (prof?.legacy_alias_onboarding_completed) {
    return NextResponse.json({ error: "ONBOARDING_ALREADY_COMPLETE" }, { status: 403 });
  }

  const { data: already } = await supabase
    .from("legacy_aliases")
    .select("id")
    .eq("claimed_by_user_id", user.id)
    .maybeSingle();
  if (already) {
    return NextResponse.json({ error: "USER_ALREADY_HAS_LEGACY_ALIAS" }, { status: 409 });
  }

  const { data: row } = await supabase
    .from("legacy_aliases")
    .select("id, claimed_by_user_id")
    .eq("id", body.alias_id)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (row.claimed_by_user_id) return NextResponse.json({ error: "ALIAS_ALREADY_CLAIMED" }, { status: 409 });

  const { error } = await supabase
    .from("legacy_aliases")
    .update({ claimed_by_user_id: user.id, claimed_at: new Date().toISOString() })
    .eq("id", body.alias_id)
    .is("claimed_by_user_id", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: migrated, error: migErr } = await supabase.rpc("migrate_legacy_predictions_from_staging", {
    p_alias_id: body.alias_id,
  });

  const { error: doneErr } = await supabase
    .from("profiles")
    .update({ legacy_alias_onboarding_completed: true, updated_at: new Date().toISOString() })
    .eq("id", user.id);
  if (doneErr) return NextResponse.json({ error: doneErr.message }, { status: 500 });

  if (migErr) {
    return NextResponse.json(
      { ok: true, migrated_predictions: 0, migration_warning: migErr.message },
      { status: 200 },
    );
  }

  return NextResponse.json({ ok: true, migrated_predictions: migrated ?? 0 });
}

