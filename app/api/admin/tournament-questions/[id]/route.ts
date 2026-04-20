import { NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/auth/require-admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, denied } = await requireAdminOrResponse();
  if (denied) return denied;
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as
    | {
        question_text?: string;
        is_active?: boolean;
        slot_no?: number;
        correct_answer?: string | null;
        visible_after_utc?: string | null;
        revealed_by_admin?: boolean;
      }
    | null;
  if (!body) return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.question_text !== undefined) patch.question_text = body.question_text;
  if (body.is_active !== undefined) patch.is_active = body.is_active;
  if (body.slot_no !== undefined) patch.slot_no = body.slot_no;
  if (body.correct_answer !== undefined) patch.correct_answer = body.correct_answer;
  if (body.visible_after_utc !== undefined) patch.visible_after_utc = body.visible_after_utc;
  if (body.revealed_by_admin !== undefined) patch.revealed_by_admin = body.revealed_by_admin;
  const { error } = await supabase.from("tournament_questions").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

