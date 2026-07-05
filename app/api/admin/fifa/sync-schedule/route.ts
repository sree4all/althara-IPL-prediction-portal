import path from "path";
import { NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/auth/require-admin";
import { importFifaMatches } from "@/lib/fifa/import-matches";

export async function POST(request: Request) {
  const { supabase, denied } = await requireAdminOrResponse();
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as
    | { fifa_dir?: string; season_year?: number }
    | null;

  const fifaDir = body?.fifa_dir?.trim() || path.join(process.cwd(), "docs", "fifa");
  const seasonYear = body?.season_year ?? 2026;

  const result = await importFifaMatches(supabase, fifaDir, seasonYear, {
    mode: "metadata",
  });

  return NextResponse.json({
    ok: result.errors.length === 0,
    updated: result.upserted,
    errors: result.errors,
  });
}
