import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { feedsFromSource, loserFeedsFromSource } from "@/lib/fifa/bracket-map";
import {
  isBracketPlaceholder,
  propagateKnockoutLoser,
} from "@/lib/fifa/bracket-progression";

/** Minimal chainable mock for the matches lookups/updates in bracket-progression. */
function mockMatchesClient(row: {
  id: string;
  home_team: string;
  away_team: string;
  home_team_display?: string | null;
  away_team_display?: string | null;
  external_key: string;
}) {
  const updates: Record<string, unknown>[] = [];
  const selectChain = {
    eq: () => selectChain,
    or: () => selectChain,
    limit: () => selectChain,
    maybeSingle: async () => ({ data: row, error: null }),
  };
  const client = {
    from: (table: string) => {
      assert.equal(table, "matches");
      return {
        select: () => selectChain,
        update: (patch: Record<string, unknown>) => ({
          eq: async (col: string, val: string) => {
            assert.equal(col, "id");
            assert.equal(val, row.id);
            updates.push(patch);
            return { error: null };
          },
        }),
      };
    },
  } as unknown as SupabaseClient;
  return { client, updates };
}

test("R32 M73 propagates to M89 home slot", () => {
  const feeds = feedsFromSource(73);
  assert.equal(feeds[0].targetMatchNumber, 89);
  assert.equal(feeds[0].targetSlot, "home");
});

test("SF M101 propagates to M104 home slot", () => {
  const feeds = feedsFromSource(101);
  assert.equal(feeds[0].targetMatchNumber, 104);
  assert.equal(feeds[0].targetSlot, "home");
});

test("R16 M92 propagates to M99 away slot", () => {
  const feeds = feedsFromSource(92);
  assert.equal(feeds.length, 1);
  assert.equal(feeds[0].targetMatchNumber, 99);
  assert.equal(feeds[0].targetSlot, "away");
});

test("R16 M93 propagates to M98 home slot", () => {
  const feeds = feedsFromSource(93);
  assert.equal(feeds[0].targetMatchNumber, 98);
  assert.equal(feeds[0].targetSlot, "home");
});

test("isBracketPlaceholder recognizes W92 and TBD", () => {
  assert.equal(isBracketPlaceholder("W92"), true);
  assert.equal(isBracketPlaceholder("TBD"), true);
  assert.equal(isBracketPlaceholder("England"), false);
});

test("SF losers feed the third-place playoff M103", () => {
  const l101 = loserFeedsFromSource(101);
  const l102 = loserFeedsFromSource(102);
  assert.equal(l101.length, 1);
  assert.equal(l101[0].targetMatchNumber, 103);
  assert.equal(l101[0].targetSlot, "home");
  assert.equal(l102.length, 1);
  assert.equal(l102[0].targetMatchNumber, 103);
  assert.equal(l102[0].targetSlot, "away");
});

test("propagateKnockoutLoser fills the M103 placeholder slot", async () => {
  const { client, updates } = mockMatchesClient({
    id: "m103-id",
    home_team: "RU101",
    away_team: "RU102",
    home_team_display: "RU101",
    away_team_display: "RU102",
    external_key: "WC26-M103",
  });

  const result = await propagateKnockoutLoser(client, 101, "Spain", 2026);
  assert.deepEqual(result.conflicts, []);
  assert.deepEqual(result.updated, [{ match_number: 103, slot: "home", team: "Spain" }]);
  assert.equal(updates.length, 1);
  assert.equal(updates[0].home_team, "Spain");
  assert.equal(updates[0].home_team_display, "Spain");
});

test("propagateKnockoutLoser flags conflicts and skips placeholder losers", async () => {
  const { client, updates } = mockMatchesClient({
    id: "m103-id",
    home_team: "France",
    away_team: "RU102",
    external_key: "WC26-M103",
  });

  const conflicting = await propagateKnockoutLoser(client, 101, "Spain", 2026);
  assert.equal(conflicting.updated.length, 0);
  assert.equal(conflicting.conflicts.length, 1);
  assert.equal(conflicting.conflicts[0].existing_team, "France");

  const placeholderLoser = await propagateKnockoutLoser(client, 102, "W100", 2026);
  assert.deepEqual(placeholderLoser, { updated: [], conflicts: [] });

  const nonLoserSource = await propagateKnockoutLoser(client, 100, "Switzerland", 2026);
  assert.deepEqual(nonLoserSource, { updated: [], conflicts: [] });

  assert.equal(updates.length, 0);
});

test("winner feeds never target M103; only SF losers do", () => {
  for (let mn = 73; mn <= 104; mn++) {
    for (const feed of feedsFromSource(mn)) {
      assert.notEqual(feed.targetMatchNumber, 103, `winner feed M${mn} targets M103`);
    }
  }
  const loserSources = [101, 102];
  for (let mn = 73; mn <= 104; mn++) {
    const expected = loserSources.includes(mn) ? 1 : 0;
    assert.equal(loserFeedsFromSource(mn).length, expected, `loser feeds for M${mn}`);
  }
});
