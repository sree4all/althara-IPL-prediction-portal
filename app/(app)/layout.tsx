import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { ensureDisplayNameFromOAuth } from "@/lib/auth/sync-profile";
import { ensureProfileScoringBootstrap } from "@/lib/scoring/profile-bootstrap";
import { AppNav } from "@/components/layout/app-nav";
import { SyncingHistory } from "@/components/auth/syncing-history";
import { WelcomeBanner } from "@/components/auth/welcome-banner";
import { getProfileForUser } from "@/lib/data/profile";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, user } = await requireUser();
  await ensureProfileScoringBootstrap(user.id);
  await ensureDisplayNameFromOAuth(supabase, user);
  const profile = await getProfileForUser(supabase, user.id);
  if (profile?.legacy_alias_onboarding_completed === false) {
    redirect("/login/legacy-alias");
  }
  const { data: seasonConfig } = await supabase
    .from("tournament_config")
    .select("maintenance_mode, maintenance_banner_text")
    .eq("season_year", 2026)
    .maybeSingle();
  const role = profile?.role ?? "user";
  const maintenanceModeOn = Boolean(seasonConfig?.maintenance_mode);
  const maintenanceText = seasonConfig?.maintenance_banner_text || "അടിമ പണിയിലാണ്";
  if (maintenanceModeOn && role !== "admin") {
    return (
      <div className="min-h-screen bg-background grid place-items-center px-6">
        <h1 className="text-center text-4xl font-extrabold tracking-tight text-red-600 sm:text-6xl">
          {maintenanceText}
        </h1>
      </div>
    );
  }
  const showWelcome =
    profile != null &&
    profile.legacy_points != null &&
    Number(profile.legacy_points) > 0;

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <SyncingHistory>
          <WelcomeBanner show={showWelcome} />
          {children}
        </SyncingHistory>
      </main>
    </div>
  );
}
