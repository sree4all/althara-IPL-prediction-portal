import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { selectOddMatchBonusCandidates } from "../lib/fifa/odd-match-bonus-candidates";
import { resolveOddBonusCutoff } from "../lib/fifa/odd-match-bonus-cutoff";
import { summarizeOddBonusSkips } from "../lib/fifa/odd-match-bonus-diagnostics";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  const sb = createClient(url, key);
  const SEASON = 2026;
  const cutoff = resolveOddBonusCutoff(SEASON);
  const now = new Date();

  const { data: prompts } = await sb
    .from("bonus_prompts")
    .select("id, match_id, prompt_key, is_active, source")
    .eq("season_year", SEASON)
    .eq("scope", "match")
    .eq("is_active", true);

  const hasBonus = new Set((prompts ?? []).map((p) => p.match_id as string));

  const { data: matches, error } = await sb
    .from("matches")
    .select("id, match_number, home_team, away_team, match_time_utc, status, tournament_stage")
    .or("season_year.eq.2026,season_year.is.null")
    .order("match_number");

  if (error) throw error;

  const oddAbove = (matches ?? []).filter(
    (m) => m.match_number != null && m.match_number > cutoff && m.match_number % 2 === 1,
  );

  console.log("cutoff", cutoff, "now", now.toISOString());
  console.log("active match bonuses", prompts?.length);
  console.log("total matches", matches?.length);
  console.log("odd matches above cutoff", oddAbove.length);

  for (const m of oddAbove) {
    const hb = hasBonus.has(m.id);
    const kickoff = new Date(m.match_time_utc as string);
    const locked = now > kickoff;
    console.log(
      `M${m.match_number}`,
      `${m.home_team} vs ${m.away_team}`,
      `status=${m.status}`,
      `kickoff=${m.match_time_utc}`,
      `locked=${locked}`,
      `hasBonus=${hb}`,
    );
  }

  const candidates = selectOddMatchBonusCandidates(
    matches ?? [],
    { cutoff, hasBonusMatchIds: hasBonus },
    now,
  );
  console.log("candidates", candidates.map((m) => m.match_number));

  const nullMn = (matches ?? []).filter((m) => m.match_number == null);
  console.log("matches with null match_number", nullMn.length);

  const skipped = summarizeOddBonusSkips(
    matches ?? [],
    { cutoff, hasBonusMatchIds: hasBonus },
    now,
  );
  const interesting = skipped.filter(
    (s) =>
      s.match_number > cutoff ||
      s.reason === "missing_match_number",
  );
  console.log("skipped (interesting)", interesting);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
