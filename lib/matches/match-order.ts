/**
 * Natural ordering for fixture keys like M1, M2, … M10 (not lexicographic).
 */

/** Extract numeric part from external_key (e.g. "M12", "m 3 "). Returns null if none. */
export function parseMatchNumberFromExternalKey(externalKey: string | null | undefined): number | null {
  if (externalKey == null) return null;
  const t = String(externalKey).trim();
  const m = t.match(/\bM\s*(\d+)\b/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function timeMs(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Sort key: lower = earlier in schedule. Prefer M-number; tie-break / fallback: kickoff UTC.
 */
export function compareMatchOrder(
  aKey: string | null | undefined,
  aTimeUtc: string | null | undefined,
  bKey: string | null | undefined,
  bTimeUtc: string | null | undefined,
): number {
  const an = parseMatchNumberFromExternalKey(aKey);
  const bn = parseMatchNumberFromExternalKey(bKey);
  if (an != null && bn != null && an !== bn) return an - bn;
  if (an != null && bn == null) return -1;
  if (an == null && bn != null) return 1;
  return timeMs(aTimeUtc) - timeMs(bTimeUtc);
}
