import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Prefer OAuth full name when display_name is still generic. */
export async function ensureDisplayNameFromOAuth(
  supabase: SupabaseClient,
  user: User,
): Promise<void> {
  const meta =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined);
  const fallback = user.email?.split("@")[0] ?? "Player";

  const { data: row } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!row) return;

  const display = (row.display_name ?? "").trim();
  const looksGeneric =
    !display || display === fallback || display === user.email?.split("@")[0];

  if (!looksGeneric || !meta) return;

  await supabase
    .from("profiles")
    .update({ display_name: meta, updated_at: new Date().toISOString() })
    .eq("id", user.id);
}
