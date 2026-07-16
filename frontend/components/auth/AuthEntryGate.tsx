"use client";

import { useAuth } from "@/stores/auth";
import { PageLoading } from "@/components/ui/PageShell";

export function AuthEntryGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoading message="Checking session..." />;
  }

  if (user) {
    return <PageLoading message="Redirecting to dashboard..." />;
  }

  return <>{children}</>;
}
