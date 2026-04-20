import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { ensureDisplayNameFromOAuth } from "@/lib/auth/sync-profile";
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
  await ensureDisplayNameFromOAuth(supabase, user);
  const profile = await getProfileForUser(supabase, user.id);
  if (profile?.legacy_alias_onboarding_completed === false) {
    redirect("/login/legacy-alias");
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
