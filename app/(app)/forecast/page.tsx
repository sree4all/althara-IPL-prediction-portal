import Link from "next/link";
import { ForecastForm } from "@/components/forecast/forecast-form";

export default function ForecastPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold">Tournament Forecast</h1>
          <p className="text-sm text-muted-foreground">
            Predict the four semi-finalists, two finalists, and the winner. Edits lock at the first
            Round of 8 kickoff (Match 97).
          </p>
        </div>
        <Link href="/forecast/stats" className="shrink-0 text-sm text-primary underline">
          Statistics
        </Link>
      </div>
      <ForecastForm />
    </main>
  );
}
