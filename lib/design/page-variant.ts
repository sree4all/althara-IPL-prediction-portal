import type { PageBackgroundVariant } from "@/lib/design/tokens";

/** Map routes to World Cup page background variants from design.json */
export function resolvePageVariant(pathname: string): PageBackgroundVariant {
  if (pathname === "/login" || pathname === "/") return "welcome";
  if (pathname.startsWith("/leaderboard")) return "standings";
  if (
    pathname.startsWith("/matches") ||
    pathname.startsWith("/match/") ||
    pathname.startsWith("/history") ||
    pathname.startsWith("/prediction-stat") ||
    pathname.startsWith("/upcoming") ||
    pathname.startsWith("/tournament")
  ) {
    return "prediction";
  }
  return "default";
}
