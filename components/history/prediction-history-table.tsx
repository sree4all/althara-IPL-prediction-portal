"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Row = {
  source_id: string;
  label: string;
  prediction: string;
  points_delta: number | null;
  status: string;
  updated_at: string;
};

const INITIAL_VISIBLE = 10;

export function PredictionHistoryTable({ rows }: { rows: Row[] }) {
  const [showAll, setShowAll] = useState(false);
  const visibleRows = showAll ? rows : rows.slice(0, INITIAL_VISIBLE);
  const hasMore = rows.length > INITIAL_VISIBLE;

  return (
    <div className="space-y-3">
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
            {visibleRows.map((r) => (
              <tr key={r.source_id} className="border-b border-border">
                <td className="px-3 py-2">{r.label}</td>
                <td className="px-3 py-2 whitespace-pre-line">{r.prediction}</td>
                <td className="px-3 py-2">{r.points_delta ?? "-"}</td>
                <td className="px-3 py-2">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasMore && !showAll ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={() => setShowAll(true)}
          >
            See more ({rows.length - INITIAL_VISIBLE} more)
          </Button>
        </div>
      ) : null}
      {hasMore && showAll ? (
        <div className="flex justify-center">
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowAll(false)}>
            Show fewer
          </Button>
        </div>
      ) : null}
    </div>
  );
}

