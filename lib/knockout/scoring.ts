import type { KnockoutStage } from "@/lib/knockout/constants";

export type KnockoutWinnerPoints = {
  correct: number;
  wrong: number;
};

/** Knockout match winner points (wrong is negative). */
export function knockoutWinnerPoints(stage: KnockoutStage): KnockoutWinnerPoints {
  if (stage === "final") {
    return { correct: 5, wrong: -2 };
  }
  return { correct: 3, wrong: -1 };
}

export function parseKnockoutStage(
  value: string | null | undefined,
): KnockoutStage | null {
  if (value === "q1" || value === "eliminator" || value === "q2" || value === "final") {
    return value;
  }
  return null;
}
