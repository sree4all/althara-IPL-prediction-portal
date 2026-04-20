import { NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/auth/require-admin";

type OptionRow = { label: string; value: string; sort_order: number };

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, denied } = await requireAdminOrResponse();
  if (denied) return denied;
  const { id: promptId } = await params;
  const body = (await request.json().catch(() => null)) as { options?: OptionRow[] } | null;
  if (!body || !Array.isArray(body.options)) {
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  }

  const { error: delErr } = await supabase.from("bonus_prompt_options").delete().eq("prompt_id", promptId);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  const rows = body.options
    .map((o, i) => ({
      prompt_id: promptId,
      label: String(o.label ?? "").trim(),
      value: String(o.value ?? "").trim(),
      sort_order: Number(o.sort_order ?? i),
      updated_at: new Date().toISOString(),
    }))
    .filter((o) => o.label && o.value);

  if (rows.length === 0) {
    return NextResponse.json({ ok: true, count: 0 });
  }

  const { error: insErr } = await supabase.from("bonus_prompt_options").insert(rows);
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  return NextResponse.json({ ok: true, count: rows.length });
}
