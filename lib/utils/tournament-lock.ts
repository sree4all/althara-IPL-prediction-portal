export function isTournamentAnswersLocked(lockUtc: string | null, now = new Date()) {
  if (!lockUtc) return false;
  return now.getTime() > new Date(lockUtc).getTime();
}

