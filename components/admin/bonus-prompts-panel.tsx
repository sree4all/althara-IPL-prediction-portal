"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type MatchRow = {
  id: string;
  external_key: string | null;
  home_team: string;
  away_team: string;
  match_time_utc: string;
  status: string;
};

type PromptOption = { id?: string; label: string; value: string; sort_order: number };

type Prompt = {
  id: string;
  scope: string;
  match_id: string | null;
  prompt_key: string;
  prompt_text: string;
  is_active: boolean;
  display_order: number;
  input_type?: string;
  options?: PromptOption[];
};

function matchLabel(m: MatchRow) {
  const k = m.external_key?.trim();
  return k ? `${k} — ${m.home_team} vs ${m.away_team}` : `${m.home_team} vs ${m.away_team}`;
}

function optionsToText(opts: PromptOption[] | undefined) {
  return (opts ?? [])
    .map((o) => `${o.label} | ${o.value}`)
    .join("\n");
}

function parseOptionsLines(raw: string): { label: string; value: string; sort_order: number }[] {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  return lines
    .map((line, i) => {
      const [a, b] = line.split("|").map((s) => s.trim());
      const label = a ?? "";
      const value = b || a || "";
      return { label, value, sort_order: i };
    })
    .filter((o) => o.label && o.value);
}

export function BonusPromptsPanel({
  initialPrompts,
  matches,
}: {
  initialPrompts: Prompt[];
  matches: MatchRow[];
}) {
  const [prompts, setPrompts] = useState(initialPrompts);
  const [matchId, setMatchId] = useState("");
  const [promptKey, setPromptKey] = useState("");
  const [promptText, setPromptText] = useState("");
  const [createInputType, setCreateInputType] = useState<"text" | "single_choice">("text");
  const [createOptionsRaw, setCreateOptionsRaw] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const matchById = useMemo(() => new Map(matches.map((m) => [m.id, m])), [matches]);

  useEffect(() => {
    void (async () => {
      const list = await fetch("/api/admin/bonus-prompts");
      if (list.ok) {
        const data = await list.json();
        setPrompts(data.prompts ?? []);
      }
    })();
  }, []);

  async function reloadPrompts() {
    const list = await fetch("/api/admin/bonus-prompts");
    if (list.ok) {
      const data = await list.json();
      setPrompts(data.prompts ?? []);
    }
  }

  async function toggleActive(id: string, next: boolean) {
    setBusy(id);
    setError(null);
    const res = await fetch(`/api/admin/bonus-prompts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: next }),
    });
    setBusy(null);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Update failed");
      return;
    }
    setPrompts((prev) => prev.map((p) => (p.id === id ? { ...p, is_active: next } : p)));
  }

  async function saveInputType(id: string, input_type: "text" | "single_choice") {
    setBusy(id);
    setError(null);
    const res = await fetch(`/api/admin/bonus-prompts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input_type }),
    });
    setBusy(null);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Update failed");
      return;
    }
    setPrompts((prev) => prev.map((p) => (p.id === id ? { ...p, input_type } : p)));
  }

  async function saveOptions(id: string, raw: string) {
    setBusy(id);
    setError(null);
    const options = parseOptionsLines(raw);
    const res = await fetch(`/api/admin/bonus-prompts/${id}/options`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ options }),
    });
    setBusy(null);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Save options failed");
      return;
    }
    await reloadPrompts();
  }

  async function addMatchPrompt(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!matchId || !promptKey.trim() || !promptText.trim()) {
      setError("Choose a match and fill prompt key + text.");
      return;
    }
    setBusy("new");
    const res = await fetch("/api/admin/bonus-prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scope: "match",
        match_id: matchId,
        prompt_key: promptKey.trim(),
        prompt_text: promptText.trim(),
        is_active: true,
        display_order: 0,
        input_type: createInputType,
      }),
    });
    setBusy(null);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Create failed");
      return;
    }
    await reloadPrompts();
    setPromptKey("");
    setPromptText("");
    setCreateOptionsRaw("");
  }

  return (
    <div className="rounded-md border border-border p-3">
      <p className="mb-2 text-sm font-semibold">Bonus prompts</p>
      <p className="mb-3 text-xs text-muted-foreground">
        Match bonus questions can be free text or a single choice. For single choice, use{" "}
        <strong>Choices for players</strong> (one line per option:{" "}
        <code className="text-xs">Label | value</code>
        ). Existing prompts list their choices below; new prompts get the same field in the add form.
      </p>
      {error ? <p className="mb-2 text-xs text-destructive">{error}</p> : null}
      {prompts.length === 0 ? (
        <p className="mb-4 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          No bonus prompts yet. Use <strong>Add match bonus question</strong> below — if you pick
          &quot;Single choice&quot;, the <strong>Choices for players</strong> box appears there.
        </p>
      ) : null}
      <ul className="mb-4 space-y-3 text-sm">
        {prompts.map((p) => {
          const m = p.match_id ? matchById.get(p.match_id) : undefined;
          const where =
            p.scope === "tournament"
              ? "Season-wide (Mega Bonus tab)"
              : m
                ? matchLabel(m)
                : p.match_id
                  ? `Match ${p.match_id}`
                  : "—";
          const it = p.input_type === "single_choice" ? "single_choice" : "text";
          return (
            <li
              key={p.id}
              className="flex flex-col gap-2 rounded border border-border px-2 py-2"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <span className="font-medium">{p.prompt_key}</span>
                  <span className="text-muted-foreground"> · </span>
                  <span>{p.prompt_text}</span>
                  <div className="text-xs text-muted-foreground">{p.scope} · {where}</div>
                  <div className="text-xs">{p.is_active ? "Active" : "Inactive"} · Input: {it}</div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy === p.id}
                  onClick={() => toggleActive(p.id, !p.is_active)}
                >
                  {p.is_active ? "Disable" : "Enable"}
                </Button>
              </div>
              <label className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                Response type
                <select
                  className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                  value={it}
                  disabled={busy === p.id}
                  onChange={(e) => {
                    const v = e.target.value as "text" | "single_choice";
                    void saveInputType(p.id, v);
                  }}
                >
                  <option value="text">Free text</option>
                  <option value="single_choice">Single choice (dropdown)</option>
                </select>
              </label>
              <div className="space-y-1 rounded-md border border-dashed border-border bg-muted/20 p-2">
                <p className="text-xs font-semibold text-foreground">Choices for players</p>
                <p className="text-[11px] text-muted-foreground">
                  One line per option. Example: <code className="text-[11px]">Virat Kohli | A</code>
                </p>
                <textarea
                  key={`bp-opt-${p.id}-${(p.options?.length ?? 0)}`}
                  className="min-h-[5.5rem] w-full rounded-md border-2 border-input bg-background px-2 py-2 font-mono text-xs text-foreground"
                  placeholder={"One per line:\nLabel | value\nOther label | B"}
                  defaultValue={optionsToText(p.options)}
                  id={`bp-opt-${p.id}`}
                  disabled={busy === p.id}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={busy === p.id}
                  onClick={() => {
                    const raw =
                      (document.getElementById(`bp-opt-${p.id}`) as HTMLTextAreaElement)?.value ?? "";
                    void saveOptions(p.id, raw);
                  }}
                >
                  Save options
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      <form onSubmit={addMatchPrompt} className="space-y-2 border-t border-border pt-3">
        <p className="text-xs font-medium">Add match bonus question</p>
        <label className="block text-xs text-muted-foreground">
          Match
          <select
            className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            value={matchId}
            onChange={(e) => setMatchId(e.target.value)}
          >
            <option value="">Select…</option>
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {matchLabel(m)} ({m.status})
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-muted-foreground">
          Response type
          <select
            className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            value={createInputType}
            onChange={(e) =>
              setCreateInputType(e.target.value as "text" | "single_choice")
            }
          >
            <option value="text">Free text</option>
            <option value="single_choice">Single choice (list players pick from)</option>
          </select>
        </label>
        {createInputType === "single_choice" ? (
          <div className="rounded-md border-2 border-primary/30 bg-muted/30 p-3">
            <p className="text-xs font-semibold text-foreground">Choices for players (required)</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              One line per option: <code className="text-[11px]">Label | value</code> (value is stored;
              label is shown).
            </p>
            <textarea
              className="mt-2 min-h-[6rem] w-full rounded-md border-2 border-input bg-background px-2 py-2 font-mono text-xs text-foreground"
              value={createOptionsRaw}
              onChange={(e) => setCreateOptionsRaw(e.target.value)}
              placeholder={"Virat Kohli | A\nGill | B"}
            />
          </div>
        ) : null}
        <label className="block text-xs text-muted-foreground">
          Prompt key (slug, unique per row you add)
          <input
            className="mt-1 w-full rounded-md border border-input px-2 py-1 text-sm"
            value={promptKey}
            onChange={(e) => setPromptKey(e.target.value)}
            placeholder="e.g. m12_top_scorer"
          />
        </label>
        <label className="block text-xs text-muted-foreground">
          Question text
          <input
            className="mt-1 w-full rounded-md border border-input px-2 py-1 text-sm"
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="Shown to players under the match pick"
          />
        </label>
        <Button type="submit" size="sm" disabled={busy === "new"}>
          Add prompt
        </Button>
      </form>
    </div>
  );
}
