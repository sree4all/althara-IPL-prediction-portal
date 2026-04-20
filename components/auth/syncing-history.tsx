"use client";

import { useEffect, useState } from "react";

type Props = {
  children: React.ReactNode;
};

/**
 * Full-screen syncing state immediately after auth before primary content (FR-010).
 */
export function SyncingHistory({ children }: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 600);
    return () => window.clearTimeout(t);
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-muted-foreground border-t-primary"
          aria-hidden
        />
        <p className="text-lg font-medium text-foreground">Syncing history…</p>
        <p className="text-sm text-muted-foreground">
          Bringing your predictions up to date.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
