/** Manual types mirroring `supabase/migrations/0001_schema.sql` — replace with generated types if using `supabase gen types`. */

export type Profile = {
  id: string;
  email: string | null;
  display_name: string;
  legacy_points: number | null;
  current_points: number;
  rank: number | null;
  role?: string;
  legacy_alias_onboarding_completed?: boolean;
  scoring_bootstrapped_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type Match = {
  id: string;
  external_key: string | null;
  home_team: string;
  away_team: string;
  match_time_utc: string;
  winner: string | null;
  bonus_result: string | null;
  status: string;
  scored_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type Prediction = {
  id: string;
  user_id: string;
  match_id: string;
  predicted_winner: string;
  bonus_pick: string | null;
  updated_at: string;
};

export type TournamentConfig = {
  id: string;
  season_year: number;
  answer_lock_utc: string | null;
  season_bonuses_visible_after_utc?: string | null;
  season_bonuses_revealed_by_admin?: boolean | null;
  maintenance_mode?: boolean | null;
  maintenance_banner_text?: string | null;
  mega_bonus_all_answers_visible?: boolean | null;
  created_at: string;
  updated_at: string;
};

export type TournamentQuestion = {
  id: string;
  season_year: number;
  slot_no: number;
  question_text: string;
  is_active: boolean;
  display_order: number;
  correct_answer?: string | null;
  scored_at?: string | null;
  visible_after_utc?: string | null;
  revealed_by_admin?: boolean;
};

export type TournamentAnswer = {
  id: string;
  user_id: string;
  question_id: string;
  answer_text: string;
  answered_at: string;
  updated_at: string;
};

export type BonusPrompt = {
  id: string;
  season_year: number;
  scope: "match" | "tournament";
  match_id: string | null;
  prompt_key: string;
  prompt_text: string;
  is_active: boolean;
  display_order: number;
  correct_answer?: string | null;
  input_type?: "text" | "single_choice";
};

export type BonusPromptOption = {
  id: string;
  prompt_id: string;
  label: string;
  value: string;
  sort_order: number;
};

export type TournamentQuestionOption = {
  id: string;
  question_id: string;
  label: string;
  value: string;
  sort_order: number;
};

export type PredictionBonusAnswer = {
  id: string;
  user_id: string;
  match_id: string | null;
  prompt_id: string;
  answer_text: string;
  updated_at: string;
};
