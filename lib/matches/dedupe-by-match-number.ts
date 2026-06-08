import { parseMatchNumberFromExternalKey } from "@/lib/matches/match-order";

type MatchLike = {
  external_key?: string | null;
  match_number?: number | null;
};

/** Prefer spec-style WC26-M{n} over legacy wc2026:m{n} / M{n} duplicates. */
function externalKeyPreference(externalKey: string | null | undefined): number {
  const k = (externalKey ?? "").trim();
  if (/^WC26-M\d+$/i.test(k)) return 3;
  if (/^wc2026:m\d+$/i.test(k)) return 2;
  if (/^M\d+$/i.test(k)) return 1;
  return 0;
}

export function fixtureNumber(row: MatchLike): number | null {
  if (row.match_number != null && Number.isFinite(row.match_number)) {
    return Number(row.match_number);
  }
  return parseMatchNumberFromExternalKey(row.external_key);
}

function pickPreferred<T extends MatchLike>(a: T, b: T): T {
  const keyDiff = externalKeyPreference(b.external_key) - externalKeyPreference(a.external_key);
  if (keyDiff !== 0) return keyDiff > 0 ? b : a;
  const aHasNum = a.match_number != null ? 1 : 0;
  const bHasNum = b.match_number != null ? 1 : 0;
  if (bHasNum !== aHasNum) return bHasNum > aHasNum ? b : a;
  return a;
}

/**
 * Collapse duplicate FIFA rows that share the same fixture number (e.g. WC26-M1 vs wc2026:m1).
 */
export function dedupeMatchesByFixtureNumber<T extends MatchLike>(rows: T[]): T[] {
  const byNumber = new Map<number, T>();
  const withoutNumber: T[] = [];

  for (const row of rows) {
    const n = fixtureNumber(row);
    if (n == null) {
      withoutNumber.push(row);
      continue;
    }
    const existing = byNumber.get(n);
    byNumber.set(n, existing ? pickPreferred(existing, row) : row);
  }

  return [...byNumber.values(), ...withoutNumber];
}

/** All row ids sharing a fixture number (for prediction lookup across legacy duplicates). */
export function idsByFixtureNumber<T extends MatchLike & { id: string }>(
  rows: T[],
): Map<number, string[]> {
  const map = new Map<number, string[]>();
  for (const row of rows) {
    const n = fixtureNumber(row);
    if (n == null) continue;
    const list = map.get(n) ?? [];
    list.push(row.id);
    map.set(n, list);
  }
  return map;
}
