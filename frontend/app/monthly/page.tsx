"use client";

import { PageShell } from "@/components/ui/PageShell";
import { MonthlySection } from "@/components/dashboard/MonthlySection";

export default function MonthlyPage() {
  return (
    <PageShell title="Monthly Report" subtitle="Monthly / Categories & heatmap">
      <MonthlySection embedded={false} />
    </PageShell>
  );
}
