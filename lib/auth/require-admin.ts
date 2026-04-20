import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function requireAdminOrResponse() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { supabase, user: null, denied: NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }) };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.role !== "admin") {
    return { supabase, user, denied: NextResponse.json({ error: "FORBIDDEN" }, { status: 403 }) };
  }
  return { supabase, user, denied: null };
}

