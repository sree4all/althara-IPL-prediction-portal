"use client";

type Row = {
  source_id: string;
  label: string;
  prediction: string;
  points_delta: number | null;
  status: string;
  updated_at: string;
};

export function PredictionHistoryTable({ rows }: { rows: Row[] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left">
            <th className="px-3 py-2">Item</th>
            <th className="px-3 py-2">Prediction</th>
            <th className="px-3 py-2">Points</th>
            <th className="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.source_id} className="border-b border-border">
              <td className="px-3 py-2">{r.label}</td>
              <td className="px-3 py-2">{r.prediction}</td>
              <td className="px-3 py-2">{r.points_delta ?? "-"}</td>
              <td className="px-3 py-2">{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

