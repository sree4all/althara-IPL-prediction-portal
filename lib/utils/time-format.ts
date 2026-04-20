const IST_TIME_ZONE = "Asia/Kolkata";

function two(value: string | undefined) {
  return value?.padStart(2, "0") ?? "00";
}

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
