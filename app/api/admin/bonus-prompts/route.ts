import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdminOrResponse } from "@/lib/auth/require-admin";

export async function GET(request: NextRequest) {
  const { supabase, denied } = await requireAdminOrResponse();
  if (denied) return denied;
  const matchId = request.nextUrl.searchParams.get("match_id");
  let q = supabase
    .from("bonus_prompts")
    .select(
      "id, scope, match_id, prompt_key, prompt_text, is_active, display_order, input_type, correct_answer",
    )
    .eq("season_year", 2026)
    .order("display_order", { ascending: true });
  if (matchId) {
    q = q.eq("scope", "match").eq("match_id", matchId);
  }
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const list = data ?? [];
  const ids = list.map((p) => p.id as string);
  if (ids.length === 0) {
    return NextResponse.json({ prompts: [] });
  }
  const { data: opts, error: oErr } = await supabase
    .from("bonus_prompt_options")
    .select("id, prompt_id, label, value, sort_order")
    .in("prompt_id", ids)
    .order("sort_order", { ascending: true });
  if (oErr) return NextResponse.json({ error: oErr.message }, { status: 500 });
  const byPrompt = new Map<string, NonNullable<typeof opts>>();
  for (const o of opts ?? []) {
    const pid = o.prompt_id as string;
    if (!byPrompt.has(pid)) byPrompt.set(pid, []);
    byPrompt.get(pid)!.push(o);
  }
  const prompts = list.map((p) => ({
    ...p,
    options: byPrompt.get(p.id as string) ?? [],
  }));
  return NextResponse.json({ prompts });
}

type OptionRow = { label: string; value: string; sort_order: number };

export async function POST(request: Request) {
  const { supabase, denied } = await requireAdminOrResponse();
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as
    | {
        scope?: "match" | "tournament";
        match_id?: string | null;
        prompt_key?: string;
        prompt_text?: string;
        is_active?: boolean;
        display_order?: number;
        input_type?: "text" | "single_choice";
        options?: OptionRow[];
      }
    | null;
  if (!body?.scope || !body.prompt_key || !body.prompt_text) {
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  }
  if (body.scope === "match" && !body.match_id) {
    return NextResponse.json({ error: "MATCH_ID_REQUIRED" }, { status: 400 });
  }
  const { data: row, error } = await supabase
    .from("bonus_prompts")
    .insert({
      season_year: 2026,
      scope: body.scope,
      match_id: body.scope === "match" ? body.match_id ?? null : null,
      prompt_key: body.prompt_key,
      prompt_text: body.prompt_text,
      is_active: body.is_active ?? true,
      display_order: body.display_order ?? 0,
      input_type: body.input_type ?? "text",
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const promptId = row.id as string;

  const rawOpts = Array.isArray(body.options) ? body.options : [];
  const optionRows = rawOpts
    .map((o, i) => ({
      prompt_id: promptId,
      label: String(o.label ?? "").trim(),
      value: String(o.value ?? "").trim(),
      sort_order: Number(o.sort_order ?? i),
      updated_at: new Date().toISOString(),
    }))
    .filter((o) => o.label && o.value);

  if (optionRows.length > 0) {
    const { error: oErr } = await supabase.from("bonus_prompt_options").insert(optionRows);
    if (oErr) return NextResponse.json({ error: oErr.message, id: promptId }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: promptId });
}

