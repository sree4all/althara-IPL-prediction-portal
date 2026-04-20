"use client";

type Opt = { label: string; value: string; sort_order?: number };

const RADIO_MAX = 14;

/** Shows all choices visibly (radio list) when there are few options; otherwise a native select. */
export function StructuredPromptChoice({
  options,
  value,
  onChange,
  name,
  idPrefix,
}: {
  options: Opt[];
  value: string;
  onChange: (v: string) => void;
  name: string;
  idPrefix: string;
}) {
  const sorted = [...options].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  if (sorted.length === 0) return null;

  if (sorted.length <= RADIO_MAX) {
    return (
      <fieldset className="mt-1 space-y-2 rounded-md border border-border bg-muted/20 p-3">
        <legend className="sr-only">Choose one answer</legend>
        {sorted.map((o, i) => {
          const id = `${idPrefix}-${i}`;
          return (
            <label
              key={`${o.value}\t${o.label}`}
              htmlFor={id}
              className="flex cursor-pointer items-start gap-2 text-sm leading-snug"
            >
              <input
                id={id}
                type="radio"
                name={name}
                className="mt-0.5 shrink-0"
                checked={value === o.value}
                onChange={() => onChange(o.value)}
              />
              <span className="text-foreground">{o.label}</span>
            </label>
          );
        })}
      </fieldset>
    );
  }

  return (
    <select
      className="mt-1 w-full min-h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select an answer…</option>
      {sorted.map((o) => (
        <option key={`${o.value}\t${o.label}`} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
