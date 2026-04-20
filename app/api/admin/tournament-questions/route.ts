import { NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/auth/require-admin";

export async function POST(request: Request) {
  const { supabase, user, denied } = await requireAdminOrResponse();
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as
    | { slot_no?: number; question_text?: string; is_active?: boolean }
    | null;
  if (!body?.slot_no || !body.question_text) {
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  }
  const { error } = await supabase.from("tournament_questions").upsert({
    season_year: 2026,
    slot_no: body.slot_no,
    question_text: body.question_text,
    is_active: body.is_active ?? true,
    display_order: body.slot_no,
    created_by: user?.id ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

