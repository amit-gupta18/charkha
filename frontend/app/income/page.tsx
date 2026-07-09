"use client";

import { useState } from "react";
import { PageShell } from "@/components/ui/PageShell";
import { IncomeSection } from "@/components/dashboard/IncomeSection";

export default function IncomePage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <PageShell title="Income" subtitle="Income / Allowance & freelance">
      <IncomeSection embedded={false} refreshKey={refreshKey} onChanged={() => setRefreshKey((k) => k + 1)} />
    </PageShell>
  );
}
