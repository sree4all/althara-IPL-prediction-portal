import type { LeaderboardRow } from "@/lib/data/leaderboard";
import { cn } from "@/lib/utils";

type Props = {
  rows: LeaderboardRow[];
};

const rankStyles: Record<number, string> = {
  1: "bg-wc-yellow/15 text-wc-yellow",
  2: "bg-white/10 text-white",
  3: "bg-wc-orange/15 text-wc-orange",
};

export function LeaderboardTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <p className="text-center text-sm text-white/55">
        No participants yet.
      </p>
    );
  }

  return (
    <div className="wc-glass-card overflow-hidden">
      <div className="wc-scoreboard-strip" aria-hidden />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] text-left text-sm">
          <thead className="bg-white/5">
            <tr>
              <th className="px-4 py-3 font-semibold text-white/70">#</th>
              <th className="px-4 py-3 font-semibold text-white/70">Name</th>
              <th className="px-4 py-3 font-semibold text-white/70">Points</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-t border-white/10 transition-colors hover:bg-white/5"
              >
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex h-7 min-w-7 items-center justify-center rounded-full text-xs font-bold",
                      rankStyles[r.rank ?? 0] ?? "text-white/50",
                    )}
                  >
                    {r.rank}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold text-white">{r.display_name}</td>
                <td className="px-4 py-3 font-bold tabular-nums text-wc-cta">
                  {r.current_points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
