import { createClient } from "@/lib/supabase/server";
import { PredictionHistoryTable } from "@/components/history/prediction-history-table";
import { PageHeader } from "@/components/layout/page-header";
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
      <PageHeader title="My History" />
      <PredictionHistoryTable rows={rows} />
    </div>
  );
}

