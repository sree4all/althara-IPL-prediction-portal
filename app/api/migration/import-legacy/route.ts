import { NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/auth/require-admin";

export async function POST(request: Request) {
  const { supabase, denied } = await requireAdminOrResponse();
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as
    | { rows?: { season_label: string; legacy_name: string; legacy_email?: string | null; migration_payload?: unknown }[] }
    | null;
  if (!body?.rows) return NextResponse.json({ error: "VALIDATION" }, { status: 400 });

  const payload = body.rows.map((r) => ({
    season_label: r.season_label,
    legacy_name: r.legacy_name,
    legacy_email: r.legacy_email ?? null,
    migration_payload: r.migration_payload ?? null,
  }));
  const { error } = await supabase.from("legacy_aliases").upsert(payload, {
    onConflict: "season_label,legacy_name",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, count: payload.length });
}

