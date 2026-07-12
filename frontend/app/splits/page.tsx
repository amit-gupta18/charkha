"use client";

import { PageShell } from "@/components/ui/PageShell";
import { SplitsSection } from "@/components/dashboard/SplitsSection";

export default function SplitsPage() {
  return (
    <PageShell title="Splits" subtitle="Flatmates / Split expenses & settlements">
      <SplitsSection embedded={false} />
    </PageShell>
  );
}
