export const MVP2_ROUTES = {
  FULL_SCHEDULE: "/api/matches/full-schedule",
  TOURNAMENT_QUESTIONS: "/api/tournament/questions",
  TOURNAMENT_ANSWERS: "/api/tournament/answers",
  ADMIN_CONFIG: "/api/admin/config",
  HISTORY: "/api/history",
  COMMUNITY_PICKS: "/api/community-picks",
  MIGRATION_IMPORT: "/api/migration/import-legacy",
  MIGRATION_ALIASES: "/api/migration/aliases",
  MIGRATION_ALIAS_CLAIM: "/api/migration/aliases/claim",
} as const;

export type Mvp2RouteKey = keyof typeof MVP2_ROUTES;
