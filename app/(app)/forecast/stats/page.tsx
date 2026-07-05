import Link from "next/link";
import { ForecastStatsView } from "@/components/forecast/forecast-stats";

export default function ForecastStatsPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold">Forecast picks</h1>
          <p className="text-sm text-muted-foreground">
            Every member&apos;s tournament forecast — semi-finalists, finalists, and winner.
          </p>
        </div>
        <Link href="/forecast" className="shrink-0 text-sm text-primary underline">
          My forecast
        </Link>
      </div>
      <ForecastStatsView />
    </main>
  );
}
