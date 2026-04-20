import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileForUser } from "@/lib/data/profile";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const profile = await getProfileForUser(supabase, user.id);
    if (profile?.legacy_alias_onboarding_completed === false) {
      redirect("/login/legacy-alias");
    }
    redirect("/matches");
  }
  redirect("/login");
}
