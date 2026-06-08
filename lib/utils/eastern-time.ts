/** US Eastern (America/New_York) — FIFA CSV kickoffs and match display. */

export const US_EASTERN_TIME_ZONE = "America/New_York";

const KICKOFF_STRIP_OFFSET = /\s*(?:[+-]\d{2}(?::\d{2})?|Z)\s*$/i;

/**
 * CSV wall clock (e.g. `2026-06-12 21:00:00-07`) is US Eastern; offset suffix is ignored.
 * Returns UTC instant for storage in `match_time_utc`.
 */
export function parseKickoffCsvAsUtcIso(kickoff: string): string {
  const bare = kickoff.trim().replace(KICKOFF_STRIP_OFFSET, "");
  const m = bare.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/);
  if (!m) {
    throw new Error(`Invalid kickoff_at: ${kickoff}`);
  }
  return easternWallToUtc(
    Number(m[1]),
    Number(m[2]),
    Number(m[3]),
    Number(m[4]),
    Number(m[5]),
    Number(m[6]),
  ).toISOString();
}

/** Convert Eastern wall time to the corresponding UTC instant. */
export function easternWallToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
): Date {
  const targetMs = Date.UTC(year, month - 1, day, hour, minute, second);
  let guess = targetMs;

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: US_EASTERN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  for (let i = 0; i < 4; i++) {
    const parts = formatter.formatToParts(new Date(guess));
    const map = new Map(parts.map((p) => [p.type, p.value]));
    const ey = Number(map.get("year"));
    const em = Number(map.get("month"));
    const ed = Number(map.get("day"));
    const eh = Number(map.get("hour"));
    const emin = Number(map.get("minute"));
    const es = Number(map.get("second"));
    const shownMs = Date.UTC(ey, em - 1, ed, eh, emin, es);
    const diff = targetMs - shownMs;
    if (diff === 0) break;
    guess += diff;
  }

  return new Date(guess);
}

/**
 * Match display: Eastern only (e.g. `Fri, Jun 12, 9:00 PM EDT Eastern`).
 */
export function formatEasternDateTime(input: Date | string): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "Invalid date";

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: US_EASTERN_TIME_ZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  return `${get("weekday")}, ${get("month")} ${get("day")}, ${get("hour")}:${get("minute")} ${get("dayPeriod")} ${get("timeZoneName")} Eastern`;
}
