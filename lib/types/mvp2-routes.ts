export const MVP2_ROUTES = {
  FULL_SCHEDULE: "/api/matches/full-schedule",
  TOURNAMENT_QUESTIONS: "/api/tournament/questions",
  TOURNAMENT_ANSWERS: "/api/tournament/answers",
  ADMIN_CONFIG: "/api/admin/config",
  HISTORY: "/api/history",
  COMMUNITY_PICKS: "/api/community-picks",
  ADMIN_SCORING_STAGES: "/api/admin/scoring/stages",
  FORECAST_ELIGIBILITY: "/api/forecast/eligibility",
  FORECAST_ANSWERS: "/api/forecast/answers",
  FORECAST_STATS: "/api/forecast/stats",
  ADMIN_FORECAST_VISIBILITY: "/api/admin/forecast/visibility",
  ADMIN_FIFA_SYNC_SCHEDULE: "/api/admin/fifa/sync-schedule",
  ADMIN_GENERATE_ODD_BONUSES: "/api/admin/bonus/generate-odd-matches",
} as const;

export type Mvp2RouteKey = keyof typeof MVP2_ROUTES;
