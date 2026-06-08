import { requireUser } from "@/lib/auth/require-user";
import { ensureDisplayNameFromOAuth } from "@/lib/auth/sync-profile";
import { ensureProfileScoringBootstrap } from "@/lib/scoring/profile-bootstrap";
import { AppNav } from "@/components/layout/app-nav";
import { AppShell } from "@/components/layout/app-shell";
import { SyncingHistory } from "@/components/auth/syncing-history";
import { getProfileForUser } from "@/lib/data/profile";
import { getMaintenanceGate } from "@/lib/data/tournament-config";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, user } = await requireUser();
  await ensureProfileScoringBootstrap(user.id);
  await ensureDisplayNameFromOAuth(supabase, user);
  const profile = await getProfileForUser(supabase, user.id);
  const { on: maintenanceModeOn, text: maintenanceText } = await getMaintenanceGate(supabase);
  const role = profile?.role ?? "user";
  if (maintenanceModeOn && role !== "admin") {
    return (
      <AppShell>
        <div className="grid min-h-screen place-items-center px-6">
          <h1 className="text-center text-4xl font-extrabold tracking-tight text-wc-yellow sm:text-6xl">
            {maintenanceText}
          </h1>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <AppNav />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <SyncingHistory>{children}</SyncingHistory>
      </main>
    </AppShell>
  );
}
