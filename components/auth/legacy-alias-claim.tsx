"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Alias = { id: string; season_label: string; legacy_name: string };

export function LegacyAliasClaim() {
  const router = useRouter();
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/migration/aliases");
      if (!res.ok) return;
      const data = await res.json();
      setAliases(data.aliases ?? []);
    })();
  }, []);

  async function claim() {
    if (!selected || busy) return;
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/migration/aliases/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alias_id: selected }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setMsg(j.error ?? "Could not claim");
      return;
    }
    router.replace("/matches");
    router.refresh();
  }

  async function skip() {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/migration/aliases/skip-onboarding", { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setMsg(j.error ?? "Could not continue");
      return;
    }
    router.replace("/matches");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {aliases.length > 0 ? (
        <>
          <p className="text-sm text-muted-foreground">
            Choose the name you used in the old tally. Each name can be claimed once.
          </p>
          <select
            className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Select your old name</option>
            {aliases.map((a) => (
              <option key={a.id} value={a.id}>
                {a.legacy_name} ({a.season_label})
              </option>
            ))}
          </select>
          <Button className="w-full" size="sm" disabled={busy || !selected} onClick={claim}>
            Claim and continue
          </Button>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          No unclaimed legacy names are available for this season. You can continue without linking.
        </p>
      )}
      <Button variant="outline" className="w-full" size="sm" disabled={busy} onClick={skip}>
        {aliases.length > 0 ? "Skip — I'm new here" : "Continue"}
      </Button>
      {msg ? <p className="text-center text-sm text-destructive">{msg}</p> : null}
    </div>
  );
}
