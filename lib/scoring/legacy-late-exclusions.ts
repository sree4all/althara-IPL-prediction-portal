const LEGACY_LATE_EXCLUSION_KEYS = new Set([
  // Legacy rows explicitly marked late in backup exports.
  "4d6cb0a9-b9fd-475a-a68e-2de5e78d2826|M8",
  "4d6cb0a9-b9fd-475a-a68e-2de5e78d2826|M10",
  "4d6cb0a9-b9fd-475a-a68e-2de5e78d2826|M17",
  "2dbfd87b-1ecc-4950-a4ee-879e9d0f952e|M13",
  "57e57f7b-ff4b-4717-af4d-3f5e7e1968e6|M20",
  "57e57f7b-ff4b-4717-af4d-3f5e7e1968e6|M27",
]);

export function isLegacyLateExcluded(userId: string, externalKey: string | null | undefined): boolean {
  if (!externalKey) return false;
  return LEGACY_LATE_EXCLUSION_KEYS.has(`${userId}|${externalKey.trim()}`);
}
