/**
 * List completed matches where match-scoped bonus prompts lack correct_answer.
 *
 *   npm run audit:match-bonus
 */
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { resolve } from "path";

for (const name of [".env", ".env.local"] as const) {
  loadEnv({ path: resolve(process.cwd(), name), override: name === ".env.local" });
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  if (!url || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: matches } = await supabase
    .from("matches")
    .select("id, external_key, winner, bonus_result, status")
    .eq("status", "completed")
    .order("external_key", { ascending: true });

  const { data: prompts } = await supabase
    .from("bonus_prompts")
    .select("id, match_id, prompt_key, correct_answer")
    .eq("season_year", 2026)
    .eq("scope", "match");

  const promptsByMatch = new Map<string, typeof prompts>();
  for (const p of prompts ?? []) {
    const mid = p.match_id as string;
    if (!mid) continue;
    if (!promptsByMatch.has(mid)) promptsByMatch.set(mid, []);
    promptsByMatch.get(mid)!.push(p);
  }

  let missing = 0;
  for (const m of matches ?? []) {
    const mid = m.id as string;
    const list = promptsByMatch.get(mid) ?? [];
    if (list.length === 0) continue;
    const bad = list.filter((p) => !(p.correct_answer as string | null)?.trim());
    if (bad.length > 0) {
      missing += 1;
      console.log(
        `${m.external_key}: ${bad.length}/${list.length} prompt(s) missing correct_answer`,
      );
    }
  }

  const m60 = (matches ?? []).find((m) => m.external_key === "M60");
  if (m60) {
    const p60 = promptsByMatch.get(m60.id as string) ?? [];
    console.log("\nM60 detail:");
    for (const p of p60) {
      console.log(`  ${p.prompt_key}: correct_answer=${JSON.stringify(p.correct_answer)}`);
    }
    console.log(`  matches.bonus_result=${JSON.stringify(m60.bonus_result)}`);
  }

  console.log(`\nCompleted matches with prompts but missing correct_answer: ${missing}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
