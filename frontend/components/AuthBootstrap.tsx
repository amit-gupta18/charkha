"use client";

import { startTransition, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { refreshSession } from "@/lib/api";
import { subscribeAuthEvents } from "@/lib/sessionSync";
import { useAuthStore } from "@/stores/auth";

const PUBLIC_ROUTES = new Set(["/", "/login", "/signup"]);
const AUTH_ENTRY_ROUTES = new Set(["/login", "/signup"]);
const SESSION_REFRESH_MS = 45 * 60 * 1000;

/** Runs session bootstrap, refresh, cross-tab sync, and route guards. State lives in useAuthStore. */
export function AuthBootstrap() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const loadSession = useAuthStore((s) => s.loadSession);
  const handleSessionLost = useAuthStore((s) => s.handleSessionLost);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        await loadSession({ clearOnFailure: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [loadSession, setLoading]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshSession();
    }, SESSION_REFRESH_MS);

    function onVisible() {
      if (document.visibilityState === "visible") {
        void loadSession();
      }
    }

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [loadSession]);

  useEffect(() => {
    return subscribeAuthEvents((event) => {
      if (event.type === "logout") {
        handleSessionLost();
        return;
      }
      if (event.type === "login") return;
      void loadSession();
    });
  }, [loadSession, handleSessionLost]);

  useEffect(() => {
    if (isLoading) return;

    if (user && AUTH_ENTRY_ROUTES.has(pathname)) {
      startTransition(() => {
        router.replace("/dashboard");
      });
      return;
    }

    if (!user && !PUBLIC_ROUTES.has(pathname)) {
      startTransition(() => {
        router.replace("/login");
      });
    }
  }, [isLoading, user, pathname, router]);

  return null;
}
