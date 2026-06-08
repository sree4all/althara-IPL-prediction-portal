"use client";

import { useEffect, useState } from "react";
import { formatEasternDateTime } from "@/lib/utils/eastern-time";

export function UtcNowClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (now === null) {
    return (
      <p className="mb-4 text-sm font-bold tabular-nums text-wc-yellow" aria-hidden>
        Current time (Eastern): …
      </p>
    );
  }

  return (
    <p
      className="mb-4 inline-flex flex-wrap items-baseline gap-1 rounded-lg bg-white/5 px-3 py-2 text-sm font-bold tabular-nums text-wc-yellow"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="text-white/70">Current time (Eastern):</span>
      {formatEasternDateTime(now)}
    </p>
  );
}
