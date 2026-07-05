import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildForecastEligibility } from "@/lib/fifa/forecast-data";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const raw = await buildForecastEligibility(supabase);
  const { _state, ...body } = raw;
  void _state;
  return NextResponse.json(body);
}
