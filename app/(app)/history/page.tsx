import { createClient } from "@/lib/supabase/server";
import { PredictionHistoryTable } from "@/components/history/prediction-history-table";
import { getHistoryRows } from "@/lib/data/history";

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }
  const rows = await getHistoryRows(supabase, user.id);
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold tracking-tight">My History</h1>
      <PredictionHistoryTable rows={rows} />
    </div>
  );
}

