import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getProfileForUser } from "@/lib/data/profile";
import { MegaBonusAnswersOverview } from "@/components/tournament/mega-bonus-answers-overview";

export default async function MegaBonusAnswersAdminPage() {
  const { supabase, user } = await requireUser();
  const profile = await getProfileForUser(supabase, user.id);
  if ((profile?.role ?? "user") !== "admin") {
    redirect("/matches");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Mega Bonus — all player answers</h1>
        <Link href="/admin" className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
          Back to Admin
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        One row per player who has saved at least one Mega Bonus slot answer. Columns follow question slots (Q1–Q9).
      </p>
      <MegaBonusAnswersOverview />
    </div>
  );
}
