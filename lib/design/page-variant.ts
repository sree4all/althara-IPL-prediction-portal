import type { PageBackgroundVariant } from "@/lib/design/tokens";

/** Alternate hero background per route (cycles A → B → C). */
export function resolvePageVariant(pathname: string): PageBackgroundVariant {
  if (pathname === "/login" || pathname === "/") return "heroA";
  if (pathname.startsWith("/leaderboard")) return "heroC";
  if (pathname.startsWith("/prediction-stat")) return "heroB";
  if (pathname.startsWith("/history")) return "heroA";
  if (pathname.startsWith("/matches")) return "heroB";
  if (pathname.startsWith("/match/")) return "heroC";
  if (pathname.startsWith("/admin")) return "heroA";
  if (pathname.startsWith("/upcoming")) return "heroB";
  return "default";
}
