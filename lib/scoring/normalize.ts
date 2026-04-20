export function normAnswer(s: string | null | undefined): string {
  return (s ?? "").trim().toUpperCase();
}
