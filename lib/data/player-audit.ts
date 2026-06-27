import type { SupabaseClient } from "@supabase/supabase-js";
import { getHistoryRows } from "@/lib/data/history";
import { getPointsLedgerForUser } from "@/lib/data/points-ledger";

export type PlayerAuditLedgerRow = {
  id: string;
  source_type: string;
  source_id: string;
  points_delta: number;
  reason: string | null;
  awarded_at: string;
  label: string;
};

export type PlayerAuditSummary = {
  profile: {
    id: string;
    display_name: string;
    email: string | null;
    current_points: number;
  };
  ledger_total: number;
  drift: number;
  history_rows: Awaited<ReturnType<typeof getHistoryRows>>;
  ledger_rows: PlayerAuditLedgerRow[];
};

async function resolveLedgerLabels(
  supabase: SupabaseClient,
  ledger: {
    id: string;
    source_type: string;
    source_id: string;
    points_delta: number | null;
    reason: string | null;
    awarded_at: string;
  }[],
): Promise<PlayerAuditLedgerRow[]> {
  const matchIds = new Set<string>();
  for (const row of ledger) {
    if (row.source_type === "match" || row.source_type === "bonus") {
      matchIds.add(row.source_id);
    }
  }

  const matchLabels = new Map<string, string>();
  if (matchIds.size > 0) {
    const { data: matches } = await supabase
      .from("matches")
      .select("id, external_key, home_team, away_team")
      .in("id", [...matchIds]);
    for (const m of matches ?? []) {
      const key = (m.external_key as string | null)?.trim();
      const label = key
        ? `${key} — ${m.home_team} vs ${m.away_team}`
        : `${m.home_team} vs ${m.away_team}`;
      matchLabels.set(m.id as string, label);
    }
  }

  return ledger.map((row) => {
    let label = row.reason ?? row.source_type;
    if (row.source_type === "match" || row.source_type === "bonus") {
      label = matchLabels.get(row.source_id) ?? `Match ${row.source_id.slice(0, 8)}…`;
      if (row.source_type === "bonus") {
        label = `Bonus · ${label}`;
      } else {
        label = `Winner · ${label}`;
      }
    } else if (row.source_type === "tournament_question") {
      label = `Removed season bonus · ${row.reason ?? row.source_id}`;
    }

    return {
      id: row.id as string,
      source_type: row.source_type as string,
      source_id: row.source_id as string,
      points_delta: Number(row.points_delta ?? 0),
      reason: (row.reason as string | null) ?? null,
      awarded_at: row.awarded_at as string,
      label,
    };
  });
}

export async function getPlayerAudit(
  supabase: SupabaseClient,
  userId: string,
): Promise<PlayerAuditSummary | null> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, display_name, email, current_points")
    .eq("id", userId)
    .maybeSingle();
  if (error || !profile) return null;

  const ledger = await getPointsLedgerForUser(supabase, userId);
  const ledgerTotal = ledger.reduce((s, r) => s + Number(r.points_delta ?? 0), 0);
  const currentPoints = Number(profile.current_points ?? 0);

  const [history_rows, ledger_rows] = await Promise.all([
    getHistoryRows(supabase, userId),
    resolveLedgerLabels(supabase, ledger),
  ]);

  return {
    profile: {
      id: profile.id as string,
      display_name: (profile.display_name as string) || "Player",
      email: (profile.email as string | null) ?? null,
      current_points: currentPoints,
    },
    ledger_total: ledgerTotal,
    drift: currentPoints - ledgerTotal,
    history_rows,
    ledger_rows,
  };
}

export async function searchProfilesByName(
  supabase: SupabaseClient,
  query: string,
  limit = 15,
): Promise<{ id: string; display_name: string; current_points: number }[]> {
  const q = query.trim();
  if (!q) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, current_points")
    .ilike("display_name", `%${q}%`)
    .order("display_name", { ascending: true })
    .limit(limit);

  if (error || !data) return [];

  return data.map((p) => ({
    id: p.id as string,
    display_name: (p.display_name as string) || "Player",
    current_points: Number(p.current_points ?? 0),
  }));
}
