"use client";

import { PageShell } from "@/components/ui/PageShell";
import { SavingsSection } from "@/components/dashboard/SavingsSection";

export default function SavingsPage() {
  return (
    <PageShell title="Savings & Investments" subtitle="Track money invested or saved for later">
      <SavingsSection embedded={false} />
    </PageShell>
  );
}
