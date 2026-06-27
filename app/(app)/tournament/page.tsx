import { redirect } from "next/navigation";

/** Mega Bonus was removed for FIFA 2026 — only per-match bonuses (e.g. M31) remain. */
export default function TournamentPage() {
  redirect("/matches");
}
