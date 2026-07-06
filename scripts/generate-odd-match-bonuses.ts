/**
 * Generate bonus prompts for odd-numbered upcoming matches (service role).
 * Usage: npx tsx scripts/generate-odd-match-bonuses.ts [--dry-run] [--limit=5]
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { generateMatchBonus } from "../lib/ai/generate-match-bonus";
import { selectOddMatchBonusCandidates } from "../lib/fifa/odd-match-bonus-candidates";
import { resolveOddBonusCutoff } from "../lib/fifa/odd-match-bonus-cutoff";
import {
  formatOddBonusNoMatchesMessage,
  summarizeOddBonusSkips,
} from "../lib/fifa/odd-match-bonus-diagnostics";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const dryRun = process.argv.includes("--dry-run");
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 5;
const SEASON = 2026;

async function main() {
  const supabase = createClient(url!, key!);
  const cutoff = resolveOddBonusCutoff(SEASON);

  const { data: prompts } = await supabase
    .from("bonus_prompts")
    .select("match_id")
    .eq("season_year", SEASON)
    .eq("scope", "match")
    .eq("is_active", true);

  const hasBonus = new Set((prompts ?? []).map((p) => p.match_id as string));

  const { data: matches } = await supabase
    .from("matches")
    .select("id, match_number, home_team, away_team, tournament_stage, match_time_utc, status")
    .eq("season_year", SEASON)
    .order("match_number");

  const candidates = selectOddMatchBonusCandidates(matches ?? [], {
    cutoff,
    hasBonusMatchIds: hasBonus,
  });

  console.log(`Cutoff match_number=${cutoff}, candidates=${candidates.length}, dry_run=${dryRun}`);

  if (candidates.length === 0) {
    const skipped = summarizeOddBonusSkips(matches ?? [], {
      cutoff,
      hasBonusMatchIds: hasBonus,
    });
    console.error(formatOddBonusNoMatchesMessage(cutoff, skipped));
    process.exit(1);
  }

  for (const m of candidates.slice(0, limit)) {
    const matchNumber = m.match_number as number;
    const draft = await generateMatchBonus({
      match_number: matchNumber,
      home_team: m.home_team as string,
      away_team: m.away_team as string,
      tournament_stage: (m.tournament_stage as string) ?? "group",
      match_time_utc: m.match_time_utc,
    });
    console.log(`M${matchNumber}:`, draft.prompt_text, draft.options.map((o) => o.label).join(", "));
    if (dryRun) continue;

    const { data: prompt, error } = await supabase
      .from("bonus_prompts")
      .insert({
        season_year: SEASON,
        scope: "match",
        match_id: m.id,
        prompt_key: `ai_m${matchNumber}`,
        prompt_text: draft.prompt_text,
        is_active: true,
        display_order: 0,
        input_type: "single_choice",
        source: "ai_generated",
        correct_points: 3,
        incorrect_points: 0,
      })
      .select("id")
      .single();
    if (error) {
      console.error(error.message);
      continue;
    }
    await supabase.from("bonus_prompt_options").insert(
      draft.options.map((o, i) => ({
        prompt_id: prompt.id,
        label: o.label,
        value: o.value,
        sort_order: i,
      })),
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
