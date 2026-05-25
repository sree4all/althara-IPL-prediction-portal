import assert from "node:assert/strict";
import test from "node:test";

import {
  scoreTournamentAnswers,
  tournamentQuestionsToScore,
  type TournamentAnswerForScoring,
  type TournamentQuestionForScoring,
} from "../../lib/scoring/tournament-scoring";

const SLOT_POINTS = [2, 2, 2, 2, 3, 3, 5, 3, 3];
const AWARDED_AT = "2026-05-25T00:00:00.000Z";

test("Top 4 scoring treats Q1-Q4 as a shared set even when stored on one question", () => {
  const questions: TournamentQuestionForScoring[] = [
    { id: "q1", slot_no: 1, correct_answer: "RCB\nRR\nGT\nSRH" },
    { id: "q2", slot_no: 2, correct_answer: null },
    { id: "q3", slot_no: 3, correct_answer: null },
    { id: "q4", slot_no: 4, correct_answer: null },
    { id: "q7", slot_no: 7, correct_answer: null },
  ];

  const scoringQuestions = tournamentQuestionsToScore(questions, SLOT_POINTS);

  assert.deepEqual(
    scoringQuestions.map((q) => q.id),
    ["q1", "q2", "q3", "q4"],
  );

  const answers: TournamentAnswerForScoring[] = [
    { user_id: "user-a", question_id: "q1", answer_text: "RCB" },
    { user_id: "user-a", question_id: "q2", answer_text: "RR" },
    { user_id: "user-a", question_id: "q3", answer_text: "MI" },
    { user_id: "user-a", question_id: "q4", answer_text: "SRH" },
  ];

  const ledgerRows = scoreTournamentAnswers(scoringQuestions, answers, AWARDED_AT);

  assert.deepEqual(
    ledgerRows.map((row) => ({
      source_id: row.source_id,
      points_delta: row.points_delta,
      reason: row.reason,
    })),
    [
      { source_id: "q1", points_delta: 2, reason: "tournament_slot_1" },
      { source_id: "q2", points_delta: 2, reason: "tournament_slot_2" },
      { source_id: "q4", points_delta: 2, reason: "tournament_slot_4" },
    ],
  );
});

test("Top 4 scoring is not positional and scores each slot independently", () => {
  const questions: TournamentQuestionForScoring[] = [
    { id: "q1", slot_no: 1, correct_answer: "RCB" },
    { id: "q2", slot_no: 2, correct_answer: "RR" },
    { id: "q3", slot_no: 3, correct_answer: "GT" },
    { id: "q4", slot_no: 4, correct_answer: "SRH" },
  ];
  const scoringQuestions = tournamentQuestionsToScore(questions, SLOT_POINTS);
  const answers: TournamentAnswerForScoring[] = [
    { user_id: "user-a", question_id: "q1", answer_text: "SRH" },
    { user_id: "user-a", question_id: "q2", answer_text: "GT" },
    { user_id: "user-a", question_id: "q3", answer_text: "RR" },
    { user_id: "user-a", question_id: "q4", answer_text: "RCB" },
    { user_id: "user-b", question_id: "q1", answer_text: "RCB" },
    { user_id: "user-b", question_id: "q2", answer_text: "RCB" },
    { user_id: "user-b", question_id: "q3", answer_text: "GT" },
    { user_id: "user-b", question_id: "q4", answer_text: "SRH" },
  ];

  const ledgerRows = scoreTournamentAnswers(scoringQuestions, answers, AWARDED_AT);
  const pointsByUser = new Map<string, number>();
  for (const row of ledgerRows) {
    pointsByUser.set(row.user_id, (pointsByUser.get(row.user_id) ?? 0) + row.points_delta);
  }

  assert.equal(pointsByUser.get("user-a"), 8);
  assert.equal(pointsByUser.get("user-b"), 8);
});

test("Top 4 scoring uses the fixed team list and two points per matching answer", () => {
  const questions: TournamentQuestionForScoring[] = [
    { id: "q1", slot_no: 1, correct_answer: null },
    { id: "q2", slot_no: 2, correct_answer: "MI" },
    { id: "q3", slot_no: 3, correct_answer: null },
    { id: "q4", slot_no: 4, correct_answer: "CSK" },
  ];
  const scoringQuestions = tournamentQuestionsToScore(questions, [9, 9, 9, 9]);
  const answers: TournamentAnswerForScoring[] = [
    { user_id: "user-a", question_id: "q1", answer_text: "RCB" },
    { user_id: "user-a", question_id: "q2", answer_text: "Gujarat Titans (GT)" },
    { user_id: "user-a", question_id: "q3", answer_text: "Sunrisers Hyderabad - SRH" },
    { user_id: "user-a", question_id: "q4", answer_text: "MI" },
    { user_id: "user-b", question_id: "q4", answer_text: "rr" },
  ];

  const ledgerRows = scoreTournamentAnswers(scoringQuestions, answers, AWARDED_AT);

  assert.deepEqual(
    ledgerRows.map((row) => ({
      user_id: row.user_id,
      source_id: row.source_id,
      points_delta: row.points_delta,
    })),
    [
      { user_id: "user-a", source_id: "q1", points_delta: 2 },
      { user_id: "user-a", source_id: "q2", points_delta: 2 },
      { user_id: "user-a", source_id: "q3", points_delta: 2 },
      { user_id: "user-b", source_id: "q4", points_delta: 2 },
    ],
  );
});
