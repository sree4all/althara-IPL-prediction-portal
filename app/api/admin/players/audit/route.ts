import { NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/auth/require-admin";
import { getPlayerAudit, searchProfilesByName } from "@/lib/data/player-audit";
import { createServiceClient } from "@/lib/supabase/service";

/** Admin: search players by display name or load full audit for a user id. */
export async function GET(request: Request) {
  const { denied } = await requireAdminOrResponse();
  if (denied) return denied;

  const url = new URL(request.url);
  const userId = url.searchParams.get("user_id")?.trim();
  const query = url.searchParams.get("q")?.trim() ?? "";

  let supabase;
  try {
    supabase = createServiceClient();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Service client unavailable";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (userId) {
    try {
      const audit = await getPlayerAudit(supabase, userId);
      if (!audit) {
        return NextResponse.json({ error: "Player not found" }, { status: 404 });
      }
      return NextResponse.json({ audit });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Audit failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  if (!query) {
    return NextResponse.json({ error: "Provide q (name search) or user_id" }, { status: 400 });
  }

  const matches = await searchProfilesByName(supabase, query);
  return NextResponse.json({ matches });
}
