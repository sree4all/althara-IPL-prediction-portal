"use client";

import { useEffect, useState } from "react";

function formatUtcNow(d: Date) {
  return `${d.toISOString().replace("T", " ").slice(0, 19)} UTC`;
}

export function UtcNowClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (now === null) {
    return (
      <p className="mb-4 text-sm tabular-nums text-muted-foreground" aria-hidden>
        Current time (UTC): …
      </p>
    );
  }

  return (
    <p
      className="mb-4 text-sm tabular-nums text-muted-foreground"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="font-medium text-foreground">Current time (UTC):</span>{" "}
      {formatUtcNow(now)}
    </p>
  );
}
