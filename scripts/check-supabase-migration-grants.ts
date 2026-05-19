/**
 * Ensures new Supabase migrations that create public tables also grant Data API
 * access (anon / authenticated / service_role) and enable RLS.
 *
 * See supabase/migrations/README.md and Supabase Data API grant rollout (Oct 2026).
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");
const BASELINE_FILE = join(process.cwd(), "supabase", ".migration-grant-check-baseline");

const DATA_API_ROLES = ["anon", "authenticated", "service_role"] as const;

const CREATE_TABLE_RE =
  /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:only\s+)?public\.("?)(\w+)\1/gi;

const MIGRATION_FILE_RE = /^(\d{4})_.+\.sql$/i;

function readBaseline(): number {
  const raw = readFileSync(BASELINE_FILE, "utf8").trim();
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n) || n < 0) {
    throw new Error(
      `Invalid ${BASELINE_FILE}: expected a migration number like 25, got "${raw}"`,
    );
  }
  return n;
}

function stripSqlComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--[^\n]*/g, "");
}

function extractCreatedTables(sql: string): string[] {
  const tables = new Set<string>();
  const body = stripSqlComments(sql);
  let match: RegExpExecArray | null;
  CREATE_TABLE_RE.lastIndex = 0;
  while ((match = CREATE_TABLE_RE.exec(body)) !== null) {
    tables.add(match[2].toLowerCase());
  }
  return [...tables];
}

function migrationNumber(filename: string): number | null {
  const m = filename.match(MIGRATION_FILE_RE);
  return m ? Number.parseInt(m[1], 10) : null;
}

function hasTableGrant(sql: string, table: string): boolean {
  const body = stripSqlComments(sql);
  const segments = body.split(";");

  for (const segment of segments) {
    if (!/\bgrant\b/i.test(segment)) continue;
    if (!new RegExp(`\\bpublic\\.${table}\\b`, "i").test(segment)) continue;
    if (!DATA_API_ROLES.some((role) => new RegExp(`\\bto\\s+${role}\\b`, "i").test(segment))) {
      continue;
    }
    return true;
  }
  return false;
}

function hasRlsEnabled(sql: string, table: string): boolean {
  const body = stripSqlComments(sql);
  return new RegExp(
    `alter\\s+table\\s+(?:only\\s+)?public\\.${table}\\s+enable\\s+row\\s+level\\s+security`,
    "i",
  ).test(body);
}

type Violation = { file: string; message: string };

function checkMigrationFile(filename: string, baseline: number): Violation[] {
  const num = migrationNumber(filename);
  if (num === null || num <= baseline) return [];

  const sql = readFileSync(join(MIGRATIONS_DIR, filename), "utf8");
  const tables = extractCreatedTables(sql);
  if (tables.length === 0) return [];

  const violations: Violation[] = [];

  for (const table of tables) {
    if (!hasTableGrant(sql, table)) {
      violations.push({
        file: filename,
        message:
          `Table public.${table} is created without a Data API GRANT in the same migration. ` +
          `Add grants for anon, authenticated, and/or service_role (see _TEMPLATE_new_public_table.sql).`,
      });
    }
    if (!hasRlsEnabled(sql, table)) {
      violations.push({
        file: filename,
        message:
          `Table public.${table} is created without "alter table public.${table} enable row level security" ` +
          `in the same migration.`,
      });
    }
  }

  return violations;
}

function main(): void {
  const baseline = readBaseline();
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => MIGRATION_FILE_RE.test(f))
    .sort();

  const violations = files.flatMap((f) => checkMigrationFile(f, baseline));

  if (violations.length === 0) {
    console.log(
      `check-supabase-migration-grants: OK (${files.length} migrations, baseline <= ${String(baseline).padStart(4, "0")} exempt)`,
    );
    return;
  }

  console.error("check-supabase-migration-grants: FAILED\n");
  for (const v of violations) {
    console.error(`  ${v.file}\n    - ${v.message}\n`);
  }
  console.error(
    "New public tables must include explicit GRANTs and RLS in the same migration file.\n" +
      "See supabase/migrations/README.md\n",
  );
  process.exit(1);
}

main();
