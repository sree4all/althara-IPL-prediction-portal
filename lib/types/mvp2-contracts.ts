export type TournamentAnswerPayload = {
  question_id: string;
  answer_text: string;
};

export type TournamentAnswersRequest = {
  answers: TournamentAnswerPayload[];
};

export type AdminConfigPatch = {
  answer_lock_utc?: string | null;
  season_year?: number;
};

export type BonusScope = "match" | "tournament";

export type BonusPromptPayload = {
  season_year: number;
  scope: BonusScope;
  match_id?: string | null;
  prompt_key: string;
  prompt_text: string;
  is_active?: boolean;
  display_order?: number;
};
