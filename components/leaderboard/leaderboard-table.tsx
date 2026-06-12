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
    <div className="mx-auto w-full max-w-xs overflow-hidden rounded-xl border border-white/25 bg-white/15 shadow-lg shadow-violet-900/20 backdrop-blur-md sm:max-w-sm">
      <div className="wc-scoreboard-strip" aria-hidden />
      <div
        className="grid grid-cols-[2rem_1fr_auto] items-center gap-x-2 border-b border-white/15 bg-white/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white"
        aria-hidden
      >
        <span className="text-center">#</span>
        <span>Name</span>
        <span className="text-right">Pts</span>
      </div>
      <ul>
        {rows.map((r) => {
          const rank = rankLabel(r.rank ?? 0);
          return (
            <li
              key={r.id}
              className="grid grid-cols-[2rem_1fr_auto] items-center gap-x-2 border-t border-white/15 px-3 py-1.5 text-sm font-bold text-white transition-colors hover:bg-white/10"
            >
              <span
                className={cn(
                  "text-center text-white",
                  rank.isMedal ? "text-base leading-none" : "tabular-nums text-xs",
                )}
                aria-label={`Rank ${r.rank}`}
              >
                {rank.text}
              </span>
              <span className="min-w-0 truncate" title={r.display_name}>
                {r.display_name}
              </span>
              <span className="shrink-0 tabular-nums">{r.current_points}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
