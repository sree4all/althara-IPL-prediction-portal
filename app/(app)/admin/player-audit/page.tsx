import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getProfileForUser } from "@/lib/data/profile";
import { PlayerAuditPanel } from "@/components/admin/player-audit-panel";
import { PageHeader } from "@/components/layout/page-header";

export default async function AdminPlayerAuditPage() {
  const { supabase, user } = await requireUser();
  const profile = await getProfileForUser(supabase, user.id);
  if ((profile?.role ?? "user") !== "admin") {
    redirect("/matches");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Player audit"
        description="Search any participant by name to see predictions, ledger lines, and point totals."
      />
      <PlayerAuditPanel />
    </div>
  );
}
