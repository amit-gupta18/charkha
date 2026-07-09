"use client";

import { PageShell } from "@/components/ui/PageShell";
import { WeeklySection } from "@/components/dashboard/WeeklySection";

export default function WeeklyPage() {
  return (
    <PageShell title="Weekly Analysis" subtitle="Weekly / Spend vs limit">
      <WeeklySection embedded={false} />
    </PageShell>
  );
}
