import assert from "node:assert/strict";
import test from "node:test";

import {
  isFinalistsScoringAnswer,
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

test("Top 4 scoring is not positional and allows any slot order", () => {
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
  assert.equal(pointsByUser.get("user-b"), 6);
});

test("Top 4 scoring awards each correct team at most once when duplicated across Q1-Q4", () => {
  const questions: TournamentQuestionForScoring[] = [
    { id: "q1", slot_no: 1, correct_answer: null },
    { id: "q2", slot_no: 2, correct_answer: null },
    { id: "q3", slot_no: 3, correct_answer: null },
    { id: "q4", slot_no: 4, correct_answer: null },
  ];
  const scoringQuestions = tournamentQuestionsToScore(questions, SLOT_POINTS);
  const answers: TournamentAnswerForScoring[] = [
    { user_id: "user-a", question_id: "q1", answer_text: "RR" },
    { user_id: "user-a", question_id: "q2", answer_text: "RR" },
    { user_id: "user-a", question_id: "q3", answer_text: "RCB" },
    { user_id: "user-a", question_id: "q4", answer_text: "GT" },
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
      { source_id: "q3", points_delta: 2, reason: "tournament_slot_3" },
      { source_id: "q4", points_delta: 2, reason: "tournament_slot_4" },
    ],
  );
  assert.equal(
    ledgerRows.reduce((sum, row) => sum + row.points_delta, 0),
    6,
  );
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

test("Finalists Q5-Q6 use fixed RCB and GT list for 3 points per slot", () => {
  const questions: TournamentQuestionForScoring[] = [
    { id: "q5", slot_no: 5, correct_answer: "RCB" },
    { id: "q6", slot_no: 6, correct_answer: null },
  ];
  const scoringQuestions = tournamentQuestionsToScore(questions, SLOT_POINTS);
  assert.deepEqual(
    scoringQuestions.map((q) => ({ id: q.id, pts: q.pts })),
    [
      { id: "q5", pts: 3 },
      { id: "q6", pts: 3 },
    ],
  );

  const answers: TournamentAnswerForScoring[] = [
    { user_id: "user-a", question_id: "q5", answer_text: "RR" },
    { user_id: "user-a", question_id: "q6", answer_text: "RCB" },
    { user_id: "user-b", question_id: "q5", answer_text: "RCB" },
    { user_id: "user-b", question_id: "q6", answer_text: "RCB" },
    { user_id: "user-c", question_id: "q5", answer_text: "MI" },
    { user_id: "user-c", question_id: "q6", answer_text: "RR" },
    { user_id: "vis", question_id: "q5", answer_text: "PBKS" },
    { user_id: "vis", question_id: "q6", answer_text: "RR" },
  ];

  const ledgerRows = scoreTournamentAnswers(scoringQuestions, answers, AWARDED_AT);
  const pointsByUser = new Map<string, number>();
  for (const row of ledgerRows) {
    pointsByUser.set(row.user_id, (pointsByUser.get(row.user_id) ?? 0) + row.points_delta);
  }

  assert.equal(pointsByUser.get("user-a") ?? 0, 3);
  assert.equal(pointsByUser.get("user-b") ?? 0, 3);
  assert.equal(pointsByUser.get("user-c") ?? 0, 0);
  assert.equal(pointsByUser.get("vis") ?? 0, 0);
  assert.equal(isFinalistsScoringAnswer("Gujarat Titans"), true);
  assert.equal(isFinalistsScoringAnswer("RR"), false);
});

test("Top-4 points are preserved when Q5-Q6 finalists scoring is active", () => {
  const questions: TournamentQuestionForScoring[] = [
    { id: "q1", slot_no: 1, correct_answer: "RCB\nRR\nGT\nSRH" },
    { id: "q2", slot_no: 2, correct_answer: "RCB\nRR\nGT\nSRH" },
    { id: "q3", slot_no: 3, correct_answer: "RCB\nRR\nGT\nSRH" },
    { id: "q4", slot_no: 4, correct_answer: "RCB\nRR\nGT\nSRH" },
    { id: "q5", slot_no: 5, correct_answer: "RCB\nGT" },
    { id: "q6", slot_no: 6, correct_answer: "RCB\nGT" },
  ];
  const scoringQuestions = tournamentQuestionsToScore(questions, SLOT_POINTS);
  const answers: TournamentAnswerForScoring[] = [
    { user_id: "vis", question_id: "q1", answer_text: "PBKS" },
    { user_id: "vis", question_id: "q2", answer_text: "RCB" },
    { user_id: "vis", question_id: "q3", answer_text: "RR" },
    { user_id: "vis", question_id: "q4", answer_text: "SRH" },
    { user_id: "vis", question_id: "q5", answer_text: "PBKS" },
    { user_id: "vis", question_id: "q6", answer_text: "RR" },
  ];

  const ledgerRows = scoreTournamentAnswers(scoringQuestions, answers, AWARDED_AT);
  const top4 = ledgerRows.filter((r) => Number(r.reason.replace("tournament_slot_", "")) <= 4);
  const fin = ledgerRows.filter((r) => {
    const s = Number(r.reason.replace("tournament_slot_", ""));
    return s >= 5 && s <= 6;
  });

  assert.equal(top4.reduce((s, r) => s + r.points_delta, 0), 6);
  assert.equal(fin.reduce((s, r) => s + r.points_delta, 0), 0);
  assert.equal(ledgerRows.reduce((s, r) => s + r.points_delta, 0), 6);
});

test("RCB on Q1 and Q5 awards Top-4 and finalists points independently", () => {
  const questions: TournamentQuestionForScoring[] = [
    { id: "q1", slot_no: 1, correct_answer: null },
    { id: "q5", slot_no: 5, correct_answer: "RCB\nGT" },
    { id: "q6", slot_no: 6, correct_answer: null },
  ];
  const scoringQuestions = tournamentQuestionsToScore(questions, SLOT_POINTS);
  const answers: TournamentAnswerForScoring[] = [
    { user_id: "u1", question_id: "q1", answer_text: "RCB" },
    { user_id: "u1", question_id: "q5", answer_text: "RCB" },
  ];
  const ledgerRows = scoreTournamentAnswers(scoringQuestions, answers, AWARDED_AT);
  assert.equal(
    ledgerRows.reduce((s, r) => s + r.points_delta, 0),
    5,
  );
});

test("Finalists scoring stays inactive until an admin answer is saved on Q5 or Q6", () => {
  const questions: TournamentQuestionForScoring[] = [
    { id: "q5", slot_no: 5, correct_answer: null },
    { id: "q6", slot_no: 6, correct_answer: null },
    { id: "q7", slot_no: 7, correct_answer: "CSK" },
  ];
  const scoringQuestions = tournamentQuestionsToScore(questions, SLOT_POINTS);
  assert.deepEqual(
    scoringQuestions.map((q) => q.slotNo),
    [7],
  );
});

test("Top 4 scoring accepts full-name aliases from the fixed team list", () => {
  const questions: TournamentQuestionForScoring[] = [
    { id: "q1", slot_no: 1, correct_answer: null },
    { id: "q2", slot_no: 2, correct_answer: null },
    { id: "q3", slot_no: 3, correct_answer: null },
    { id: "q4", slot_no: 4, correct_answer: null },
  ];
  const scoringQuestions = tournamentQuestionsToScore(questions, SLOT_POINTS);
  const answers: TournamentAnswerForScoring[] = [
    { user_id: "sumesh-raj", question_id: "q1", answer_text: "Royal Challengers Bengaluru" },
    { user_id: "sumesh-raj", question_id: "q2", answer_text: "Rajasthan Royals" },
    { user_id: "sumesh-raj", question_id: "q3", answer_text: "Gujarat Titans" },
    { user_id: "sumesh-raj", question_id: "q4", answer_text: "Mumbai Indians" },
  ];

  const ledgerRows = scoreTournamentAnswers(scoringQuestions, answers, AWARDED_AT);

  assert.equal(ledgerRows.length, 3);
  assert.equal(
    ledgerRows.reduce((sum, row) => sum + row.points_delta, 0),
    6,
  );
});

test("Top 4 scoring awards Sumesh's RCB and RR answers four points", () => {
  const questions: TournamentQuestionForScoring[] = [
    { id: "q1", slot_no: 1, correct_answer: null },
    { id: "q2", slot_no: 2, correct_answer: null },
    { id: "q3", slot_no: 3, correct_answer: null },
    { id: "q4", slot_no: 4, correct_answer: null },
  ];
  const scoringQuestions = tournamentQuestionsToScore(questions, SLOT_POINTS);
  const answers: TournamentAnswerForScoring[] = [
    { user_id: "sumesh-raj", question_id: "q1", answer_text: "PBKS" },
    { user_id: "sumesh-raj", question_id: "q2", answer_text: "RCB" },
    { user_id: "sumesh-raj", question_id: "q3", answer_text: "RR" },
    { user_id: "sumesh-raj", question_id: "q4", answer_text: "CSK" },
  ];

  const ledgerRows = scoreTournamentAnswers(scoringQuestions, answers, AWARDED_AT);

  assert.deepEqual(
    ledgerRows.map((row) => ({
      source_id: row.source_id,
      points_delta: row.points_delta,
      reason: row.reason,
    })),
    [
      { source_id: "q2", points_delta: 2, reason: "tournament_slot_2" },
      { source_id: "q3", points_delta: 2, reason: "tournament_slot_3" },
    ],
  );
  assert.equal(
    ledgerRows.reduce((sum, row) => sum + row.points_delta, 0),
    4,
  );
});
