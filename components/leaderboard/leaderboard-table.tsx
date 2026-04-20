import type { LeaderboardRow } from "@/lib/data/leaderboard";

type Props = {
  rows: LeaderboardRow[];
};

export function LeaderboardTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        No participants yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[320px] text-left text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">Name</th>
            <th className="px-3 py-2 font-medium">Points</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border">
              <td className="px-3 py-2 text-muted-foreground">{r.rank}</td>
              <td className="px-3 py-2 font-medium">{r.display_name}</td>
              <td className="px-3 py-2">{r.current_points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
