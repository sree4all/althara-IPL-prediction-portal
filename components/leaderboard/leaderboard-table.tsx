import type { LeaderboardRow } from "@/lib/data/leaderboard";
import { cn } from "@/lib/utils";

type Props = {
  rows: LeaderboardRow[];
};

const MEDAL_BY_RANK: Record<number, string> = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

function rankLabel(rank: number): { text: string; isMedal: boolean } {
  const medal = MEDAL_BY_RANK[rank];
  if (medal) return { text: medal, isMedal: true };
  return { text: String(rank), isMedal: false };
}

export function LeaderboardTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <p className="text-center text-sm font-bold text-white">
        No participants yet.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/25 bg-white/15 shadow-lg shadow-violet-900/20 backdrop-blur-md">
      <div className="wc-scoreboard-strip" aria-hidden />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[280px] text-left text-sm font-bold text-white">
          <thead className="bg-white/15">
            <tr>
              <th className="w-11 px-3 py-2 text-xs uppercase tracking-wide text-white">
                #
              </th>
              <th className="px-3 py-2 text-xs uppercase tracking-wide text-white">
                Name
              </th>
              <th className="px-3 py-2 text-right text-xs uppercase tracking-wide text-white">
                Pts
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const rank = rankLabel(r.rank ?? 0);
              return (
                <tr
                  key={r.id}
                  className="border-t border-white/15 transition-colors hover:bg-white/10"
                >
                  <td className="px-3 py-2 text-center">
                    <span
                      className={cn(
                        "text-white",
                        rank.isMedal ? "text-base leading-none" : "tabular-nums",
                      )}
                      aria-label={`Rank ${r.rank}`}
                    >
                      {rank.text}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-white">{r.display_name}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-white">
                    {r.current_points}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
