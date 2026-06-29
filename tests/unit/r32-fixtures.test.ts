import assert from "node:assert/strict";
import { test } from "node:test";
import { parse } from "csv-parse/sync";
import * as fs from "node:fs";
import * as path from "node:path";
import { parseKickoffCsvAsUtcIso } from "@/lib/utils/eastern-time";

const fifaDir = path.resolve(process.cwd(), "docs/fifa");

function r32Rows() {
  const raw = fs.readFileSync(path.join(fifaDir, "matches.csv"), "utf8");
  const rows = parse(raw, { columns: true, skip_empty_lines: true, trim: true }) as {
    match_number: string;
    kickoff_at: string;
    match_label: string;
    stage_id: string;
  }[];
  return rows
    .map((r) => ({
      match_number: Number(r.match_number),
      kickoff_at: r.kickoff_at,
      match_label: r.match_label,
      stage_id: Number(r.stage_id),
    }))
    .filter((r) => r.stage_id === 2 && r.match_number >= 73 && r.match_number <= 88);
}

test("R32 has sixteen fixtures numbered M73–M88", () => {
  const rows = r32Rows();
  assert.equal(rows.length, 16);
  assert.deepEqual(
    rows.map((r) => r.match_number).sort((a, b) => a - b),
    Array.from({ length: 16 }, (_, i) => 73 + i),
  );
});

test("June 29 R32 opens with Brazil vs Japan (M76) at 1 PM Eastern", () => {
  const rows = r32Rows();
  const june29 = rows
    .filter((r) => r.kickoff_at.startsWith("2026-06-29"))
    .map((r) => ({
      ...r,
      utc: parseKickoffCsvAsUtcIso(r.kickoff_at),
    }))
    .sort((a, b) => a.utc.localeCompare(b.utc));

  assert.equal(june29.length, 3);
  assert.equal(june29[0].match_number, 76);
  assert.equal(june29[0].match_label, "Brazil vs Japan");
  assert.equal(june29[0].kickoff_at, "2026-06-29 13:00:00-05");
});

test("R32 rows use confirmed team names, not bracket placeholders", () => {
  for (const row of r32Rows()) {
    assert.match(row.match_label, /^[A-Za-zÀ-ÿ' .-]+ vs [A-Za-zÀ-ÿ' .-]+$/);
    assert.doesNotMatch(row.match_label, /\b[12][A-L]\b|W\d+|3[A-Z]+/);
  }
});
