import type { SupabaseClient } from "@supabase/supabase-js";

const LEDGER_PAGE = 1000;

export function sumLedgerRowsByUser(
  rows: { user_id: string; points_delta: number | null }[],
): Map<string, number> {
  const sumByUser = new Map<string, number>();
  for (const row of rows) {
    const uid = row.user_id;
    sumByUser.set(uid, (sumByUser.get(uid) ?? 0) + Number(row.points_delta ?? 0));
  }
  return sumByUser;
}

/** Sum all ledger rows (paginated — Supabase defaults to 1000 rows per request). */
export async function loadLedgerTotalsByUser(
  supabase: SupabaseClient,
): Promise<Map<string, number>> {
  const sumByUser = new Map<string, number>();
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("points_ledger")
      .select("user_id, points_delta")
      .range(offset, offset + LEDGER_PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) break;

    for (const [uid, delta] of sumLedgerRowsByUser(data)) {
      sumByUser.set(uid, (sumByUser.get(uid) ?? 0) + delta);
    }
    if (data.length < LEDGER_PAGE) break;
    offset += LEDGER_PAGE;
  }

  return sumByUser;
}
