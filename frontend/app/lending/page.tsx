"use client";

import { PageShell } from "@/components/ui/PageShell";
import { LendingSection } from "@/components/dashboard/LendingSection";

export default function LendingPage() {
  return (
    <PageShell title="Lending" subtitle="Money lent / Track receivables">
      <LendingSection embedded={false} />
    </PageShell>
  );
}
