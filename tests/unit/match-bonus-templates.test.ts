import assert from "node:assert/strict";
import test from "node:test";
import {
  isWinnerDuplicateBonus,
  MATCH_BONUS_TEMPLATES,
  pickMatchBonusTemplate,
} from "@/lib/ai/match-bonus-templates";

const ctx = {
  match_number: 99,
  home_team: "Norway",
  away_team: "England",
  tournament_stage: "round_of_16",
  match_time_utc: "2026-07-11T21:00:00.000Z",
};

test("pickMatchBonusTemplate cycles through manual templates by match number", () => {
  const bonus = pickMatchBonusTemplate(ctx);
  const expectedIdx = 99 % MATCH_BONUS_TEMPLATES.length;
  const template = MATCH_BONUS_TEMPLATES[expectedIdx]!;
  assert.ok(bonus.prompt_text.includes("Norway") || !template.prompt_text.includes("{home_team}"));
  assert.equal(bonus.options.length, 2);
  assert.equal(bonus.options[0]?.label, "Yes");
  assert.equal(bonus.options[1]?.value, "B");
});

test("pickMatchBonusTemplate never asks who will win", () => {
  for (let n = 1; n <= 120; n++) {
    const bonus = pickMatchBonusTemplate({ ...ctx, match_number: n });
    assert.equal(isWinnerDuplicateBonus(bonus.prompt_text), false, `M${n}: ${bonus.prompt_text}`);
  }
});

test("isWinnerDuplicateBonus flags winner-duplicate questions", () => {
  assert.equal(isWinnerDuplicateBonus("Who will win Norway vs England (M99)?"), true);
  assert.equal(isWinnerDuplicateBonus("Does Norway score first?"), false);
});
