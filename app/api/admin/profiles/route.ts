import { NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/auth/require-admin";
import { listAllProfiles } from "@/lib/data/player-audit";
import { createServiceClient } from "@/lib/supabase/service";

/** Admin: list all participant profiles for member pickers. */
export async function GET() {
  const { denied } = await requireAdminOrResponse();
  if (denied) return denied;

  let supabase;
  try {
    supabase = createServiceClient();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Service client unavailable";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const profiles = await listAllProfiles(supabase);
  return NextResponse.json({ profiles });
}
