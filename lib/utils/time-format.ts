export const IST_TIME_ZONE = "Asia/Kolkata";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function two(value: string | undefined) {
  return value?.padStart(2, "0") ?? "00";
}

/** `2026-06-12 21:00:00 IST` — clock / admin precision. */
export function formatIstDateTime(input: Date | string): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "Invalid date";

  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const map = new Map(parts.map((part) => [part.type, part.value]));
  const year = map.get("year") ?? "0000";
  const month = two(map.get("month"));
  const day = two(map.get("day"));
  const hour = two(map.get("hour"));
  const minute = two(map.get("minute"));
  const second = two(map.get("second"));

  return `${year}-${month}-${day} ${hour}:${minute}:${second} IST`;
}

/** `Fri, 12 Jun, 9:00 PM IST` — match cards and headers. */
export function formatIstDateTimeFriendly(input: Date | string): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "Invalid date";

  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIME_ZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  return `${get("weekday")}, ${get("day")} ${get("month")}, ${get("hour")}:${get("minute")} ${get("dayPeriod")} IST`;
}

/** UTC ISO → `datetime-local` value interpreted as IST wall time. */
export function utcIsoToIstDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso?.trim()) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const ist = new Date(d.getTime() + IST_OFFSET_MS);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())}T${pad(ist.getUTCHours())}:${pad(ist.getUTCMinutes())}`;
}

/** `datetime-local` IST wall time → UTC ISO for storage. */
export function istDatetimeLocalToUtcIso(local: string): string | null {
  const trimmed = local.trim();
  if (!trimmed) return null;
  const m = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const utcMs =
    Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5])) -
    IST_OFFSET_MS;
  return new Date(utcMs).toISOString();
}
