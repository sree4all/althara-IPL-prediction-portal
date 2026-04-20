"use client";

import { useEffect, useState } from "react";

export function ScheduleOnboardingPanel({ items }: { items: string[] }) {
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    const seen = window.localStorage.getItem("mvp2-onboarding-seen");
    setHidden(seen === "1");
  }, []);
  if (hidden) return null;
  return (
    <div className="mb-4 rounded-md border border-border bg-muted/40 p-3">
      <h2 className="text-sm font-semibold">How predictions work</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
        {items.map((it) => (
          <li key={it}>{it}</li>
        ))}
      </ul>
      <button
        className="mt-3 text-xs underline"
        onClick={() => {
          window.localStorage.setItem("mvp2-onboarding-seen", "1");
          setHidden(true);
        }}
      >
        Got it
      </button>
    </div>
  );
}

