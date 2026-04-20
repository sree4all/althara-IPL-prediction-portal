import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LegacyAliasClaim } from "@/components/auth/legacy-alias-claim";
import { getProfileForUser } from "@/lib/data/profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LegacyAliasLoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getProfileForUser(supabase, user.id);
  if (!profile) redirect("/login");
  if (profile.legacy_alias_onboarding_completed !== false) {
    redirect("/matches");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">Link your old tally name</CardTitle>
          <p className="text-sm text-muted-foreground">
            One-time step for new accounts: claim the name from the previous season so your history
            can carry over, or continue without a legacy name.
          </p>
        </CardHeader>
        <CardContent>
          <LegacyAliasClaim />
          <p className="mt-4 text-center text-xs text-muted-foreground">
            <Link href="/" className="underline">
              Home
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
