import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getHistoryRows } from "@/lib/data/history";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const rows = await getHistoryRows(supabase, user.id);
  return NextResponse.json({ user_id: user.id, rows });
}

