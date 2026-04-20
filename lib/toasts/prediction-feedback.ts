import { toast } from "sonner";

const FIRST_SAVE = "Prediction recorded for [Match]!";
const UPDATED =
  "We've updated your existing prediction with your new choice. Good luck!";
const LOCKED =
  "Sorry! The deadline for this match was 30 minutes before start time (GMT). This match is now locked.";
const TOURNAMENT_LOCKED = "Tournament answers are now locked.";

export function toastPredictionRecorded(
  matchLabel: string,
  wasUpdate: boolean,
  messageFromApi?: string,
) {
  if (messageFromApi?.trim()) {
    toast.success(messageFromApi.trim());
    return;
  }
  if (wasUpdate) {
    toast.success(UPDATED);
    return;
  }
  toast.success(FIRST_SAVE.replace("[Match]", matchLabel));
}

export function toastPredictionLocked() {
  toast.error(LOCKED);
}

export function toastPredictionError(message?: string) {
  if (message === "TOURNAMENT_ANSWERS_LOCKED") {
    toast.error(TOURNAMENT_LOCKED);
    return;
  }
  toast.error(message ?? "Could not save prediction.");
}
