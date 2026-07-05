import Link from "next/link";
import { ForecastStatsView } from "@/components/forecast/forecast-stats";

export default function ForecastStatsPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-bold">Forecast statistics</h1>
        <Link href="/forecast" className="text-sm text-primary underline">
          My forecast
        </Link>
      </div>
      <ForecastStatsView />
    </main>
  );
}
