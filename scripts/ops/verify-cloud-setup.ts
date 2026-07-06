/**
 * Verify Git, Supabase, and Vercel connectivity for Cloud Agents.
 *
 *   npm run ops:verify-cloud
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

type Check = { name: string; ok: boolean; detail: string };

const checks: Check[] = [];

function add(name: string, ok: boolean, detail: string) {
  checks.push({ name, ok, detail });
}

function hasEnv(...keys: string[]): boolean {
  return keys.every((k) => Boolean(process.env[k]?.trim()));
}

function gitRemote(): string | null {
  try {
    return execSync("git config --get remote.origin.url", {
      encoding: "utf8",
    }).trim();
  } catch {
    return null;
  }
}

async function supabaseRestPing(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    add(
      "Supabase REST",
      false,
      "Missing NEXT_PUBLIC_SUPABASE_URL and a Supabase key",
    );
    return;
  }

  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    add(
      "Supabase REST",
      res.ok || res.status === 404,
      res.ok || res.status === 404
        ? `Reachable (${res.status}) at ${url}`
        : `HTTP ${res.status}`,
    );
  } catch (err) {
    add(
      "Supabase REST",
      false,
      err instanceof Error ? err.message : String(err),
    );
  }
}

function supabaseCli(): void {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const ref = process.env.SUPABASE_PROJECT_REF;
  const dbPass = process.env.SUPABASE_DB_PASSWORD;

  if (!token) {
    add("Supabase CLI auth", false, "SUPABASE_ACCESS_TOKEN not set");
    return;
  }

  try {
    execSync("npx supabase projects list -o json", {
      encoding: "utf8",
      env: { ...process.env, SUPABASE_ACCESS_TOKEN: token },
      stdio: ["pipe", "pipe", "pipe"],
    });
    add("Supabase CLI auth", true, "Access token valid");
  } catch {
    add("Supabase CLI auth", false, "Invalid or expired SUPABASE_ACCESS_TOKEN");
  }

  const linkedPath = resolve("supabase/.temp/project-ref");
  if (existsSync(linkedPath)) {
    const linked = readFileSync(linkedPath, "utf8").trim();
    const match = ref ? linked === ref : true;
    add(
      "Supabase link",
      match,
      match
        ? `Linked to ${linked}`
        : `Linked to ${linked}, expected ${ref ?? "(any)"}`,
    );
  } else if (ref && dbPass) {
    add(
      "Supabase link",
      false,
      "Not linked yet — run npm run db:link:ci",
    );
  } else {
    add(
      "Supabase link",
      false,
      "Set SUPABASE_PROJECT_REF + SUPABASE_DB_PASSWORD, then npm run db:link:ci",
    );
  }
}

function vercelToken(): void {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    add("Vercel CLI", false, "VERCEL_TOKEN not set (optional for git auto-deploy)");
    return;
  }

  try {
    const out = execSync(`npx vercel whoami --token "${token}"`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    add("Vercel CLI", true, `Authenticated as ${out}`);
  } catch {
    add("Vercel CLI", false, "Invalid VERCEL_TOKEN");
  }
}

async function main() {
  const remote = gitRemote();
  add(
    "Git remote",
    Boolean(remote?.includes("althara-ipl-prediction-portal")),
    remote ?? "No origin remote",
  );

  add(
    "App env",
    hasEnv("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    hasEnv("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY")
      ? "Public Supabase vars present"
      : "Add NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );

  add(
    "Operator env",
    hasEnv("SUPABASE_SERVICE_ROLE_KEY"),
    hasEnv("SUPABASE_SERVICE_ROLE_KEY")
      ? "SUPABASE_SERVICE_ROLE_KEY present"
      : "Missing — operator scripts need service role",
  );

  await supabaseRestPing();
  supabaseCli();
  vercelToken();

  console.log("\nCloud connectivity report\n");
  for (const c of checks) {
    console.log(`${c.ok ? "✓" : "✗"} ${c.name}: ${c.detail}`);
  }

  const failed = checks.filter((c) => !c.ok);
  const critical = failed.filter(
    (c) =>
      !c.name.startsWith("Vercel") ||
      !c.detail.includes("optional"),
  );

  if (critical.length) {
    console.log(
      `\n${critical.length} check(s) need attention. See docs/cloud-agent-setup.md\n`,
    );
    process.exit(1);
  }

  console.log("\nAll critical checks passed.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
