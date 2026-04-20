import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * If the profile has no meaningful display_name yet, prefer OAuth full name over email local-part.
 * When CSV seed has run, `display_name` and `legacy_points` are already set — do not overwrite tally names.
 */
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
    .select("display_name, legacy_points")
    .eq("id", user.id)
    .maybeSingle();

  if (!row) return;

  const hasTallyImport =
    row.legacy_points != null && Number(row.legacy_points) > 0;
  const display = (row.display_name ?? "").trim();
  const looksGeneric =
    !display ||
    display === fallback ||
    display === user.email?.split("@")[0];

  if (hasTallyImport) return;
  if (!looksGeneric || !meta) return;

  await supabase
    .from("profiles")
    .update({ display_name: meta, updated_at: new Date().toISOString() })
    .eq("id", user.id);
}
