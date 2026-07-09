"use client";

import { PageShell } from "@/components/ui/PageShell";
import { ExpensesSection } from "@/components/dashboard/ExpensesSection";

export default function ExpensesPage() {
  return (
    <PageShell title="All Expenses" subtitle="Expenses / Filter & manage">
      <ExpensesSection embedded={false} />
    </PageShell>
  );
}
