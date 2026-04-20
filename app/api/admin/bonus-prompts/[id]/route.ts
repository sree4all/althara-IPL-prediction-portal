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
        prompt_text?: string;
        is_active?: boolean;
        scope?: "match" | "tournament";
        match_id?: string | null;
        input_type?: "text" | "single_choice";
      }
    | null;
  if (!body) return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.prompt_text !== undefined) patch.prompt_text = body.prompt_text;
  if (body.is_active !== undefined) patch.is_active = body.is_active;
  if (body.scope !== undefined) patch.scope = body.scope;
  if (body.scope !== undefined) {
    patch.match_id = body.scope === "match" ? body.match_id ?? null : null;
  }
  if (body.input_type !== undefined) patch.input_type = body.input_type;
  const { error } = await supabase.from("bonus_prompts").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

