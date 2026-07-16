"use client";

import { PageShell } from "@/components/ui/PageShell";
import { IncomeSection } from "@/components/dashboard/IncomeSection";

export default function IncomePage() {
  return (
    <PageShell title="Income" subtitle="Income / Allowance & freelance">
      <IncomeSection embedded={false} />
    </PageShell>
  );
}
