/**
 * Operator script: upsert a user's match-winner prediction (bypasses DB lock).
 *
 *   npm run ops:update-prediction -- --user "Sumesh Raj" --match 8 --winner Australia
 *   npm run ops:update-prediction -- --email sumesh1912@gmail.com --match 8 --winner Australia
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local.
 */
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { allowedWinnerPicks } from "@/lib/fifa/match-ready";

for (const name of [".env", ".env.local"] as const) {
  loadEnv({ path: resolve(process.cwd(), name), override: name === ".env.local" });
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i === -1 || i + 1 >= process.argv.length) return undefined;
  return process.argv[i + 1];
}

async function main() {
  if (!url || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const userName = argValue("--user");
  const email = argValue("--email")?.trim().toLowerCase();
  const matchArg = argValue("--match");
  const winner = argValue("--winner")?.trim();

  if ((!userName && !email) || !matchArg || !winner) {
    console.error(
      "Usage: npm run ops:update-prediction -- --user <display_name> | --email <email> --match <number> --winner <team>",
    );
    process.exit(1);
  }

  const matchNumber = Number(matchArg);
  if (!Number.isFinite(matchNumber) || matchNumber < 1) {
    console.error("Invalid --match value:", matchArg);
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let profileQuery = supabase.from("profiles").select("id, display_name, email");
  if (email) {
    profileQuery = profileQuery.eq("email", email);
  } else {
    profileQuery = profileQuery.ilike("display_name", userName!.trim());
  }
  const { data: profiles, error: pErr } = await profileQuery;
  if (pErr) {
    console.error("Profile lookup failed:", pErr.message);
    process.exit(1);
  }
  if (!profiles?.length) {
    console.error("No profile found for", email ?? userName);
    process.exit(1);
  }
  if (profiles.length > 1) {
    console.error("Multiple profiles matched; use --email instead:");
    for (const p of profiles) {
      console.error(`  ${p.display_name} <${p.email}> (${p.id})`);
    }
    process.exit(1);
  }
  const profile = profiles[0];

  const externalKeys = [`WC26-M${matchNumber}`, `wc2026:m${matchNumber}`, `M${matchNumber}`];
  const { data: matches, error: mErr } = await supabase
    .from("matches")
    .select("id, external_key, match_number, home_team, away_team, match_time_utc, tournament_stage")
    .or(
      `match_number.eq.${matchNumber},external_key.in.(${externalKeys.map((k) => `"${k}"`).join(",")})`,
    );
  if (mErr) {
    console.error("Match lookup failed:", mErr.message);
    process.exit(1);
  }
  if (!matches?.length) {
    console.error(`No match found for match number ${matchNumber}`);
    process.exit(1);
  }
  const match =
    matches.find((m) => m.external_key === `WC26-M${matchNumber}`) ??
    matches.find((m) => Number(m.match_number) === matchNumber) ??
    matches[0];

  const home = match.home_team as string;
  const away = match.away_team as string;
  const allowed = allowedWinnerPicks(
    home,
    away,
    matchNumber,
    match.tournament_stage as string | null,
  );
  if (!allowed.includes(winner)) {
    console.error(`Winner must be one of: ${allowed.join(", ")}`);
    process.exit(1);
  }

  const { data: existing } = await supabase
    .from("predictions")
    .select("id, predicted_winner")
    .eq("user_id", profile.id)
    .eq("match_id", match.id)
    .maybeSingle();

  const payload = {
    user_id: profile.id,
    match_id: match.id,
    predicted_winner: winner,
    bonus_pick: null,
    updated_at: new Date().toISOString(),
  };

  const { data: saved, error: saveErr } = await supabase
    .from("predictions")
    .upsert(payload, { onConflict: "user_id,match_id" })
    .select("id, predicted_winner, updated_at")
    .single();

  if (saveErr) {
    console.error("Prediction save failed:", saveErr.message);
    console.error(
      "If MATCH_LOCKED, run scripts/ops/update-prediction.sql in the Supabase SQL editor instead.",
    );
    process.exit(1);
  }

  console.log("Updated prediction:");
  console.log(`  User:    ${profile.display_name} <${profile.email}>`);
  console.log(
    `  Match:   ${match.external_key} (#${match.match_number}) ${home} vs ${away}`,
  );
  console.log(`  Before:  ${existing?.predicted_winner ?? "(none)"}`);
  console.log(`  After:   ${saved?.predicted_winner}`);
  console.log(`  Saved:   ${saved?.updated_at}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
