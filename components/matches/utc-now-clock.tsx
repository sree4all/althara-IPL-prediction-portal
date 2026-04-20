"use client";

import { useEffect, useState } from "react";
import { formatIstDateTime } from "@/lib/utils/time-format";

export function UtcNowClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (now === null) {
    return (
      <p className="mb-4 text-sm font-bold tabular-nums text-red-600" aria-hidden>
        Current time (IST): …
      </p>
    );
  }

  return (
    <p
      className="mb-4 text-sm font-bold tabular-nums text-red-600"
      aria-live="polite"
      aria-atomic="true"
    >
      <span>Current time (IST):</span> {formatIstDateTime(now)}
    </p>
  );
}
