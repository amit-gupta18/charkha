"use client";

import { startTransition, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { refreshAccessToken } from "@/lib/api";
import { getRefreshToken } from "@/lib/auth-session";
import { subscribeAuthEvents } from "@/lib/sessionSync";
import { useAuthStore } from "@/stores/auth";

const PUBLIC_ROUTES = new Set(["/", "/login", "/signup"]);
const AUTH_ENTRY_ROUTES = new Set(["/login", "/signup"]);
/** Proactive refresh before 15m access token expires. */
const SESSION_REFRESH_MS = 12 * 60 * 1000;

/** Runs session bootstrap, refresh, cross-tab sync, and route guards. State lives in useAuthStore. */
export function AuthBootstrap() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isLoading = useAuthStore((s) => s.isLoading);
  const bootstrapSession = useAuthStore((s) => s.bootstrapSession);
  const handleSessionLost = useAuthStore((s) => s.handleSessionLost);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        await bootstrapSession();
      } finally {
        if (!cancelled) useAuthStore.setState({ isLoading: false });
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [bootstrapSession]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (getRefreshToken()) void refreshAccessToken();
    }, SESSION_REFRESH_MS);

    function onVisible() {
      if (document.visibilityState === "visible" && getRefreshToken()) {
        void refreshAccessToken();
      }
    }

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

  useEffect(() => {
    return subscribeAuthEvents((event) => {
      if (event.type === "logout") {
        handleSessionLost();
        return;
      }
      // Login tab already called setSession — don't re-bootstrap (can clear session if refresh races).
      if (event.type === "login") return;
      void refreshAccessToken();
    });
  }, [bootstrapSession, handleSessionLost]);

  useEffect(() => {
    if (isLoading) return;

    const isAuthenticated = !!user && !!accessToken;

    if (isAuthenticated && AUTH_ENTRY_ROUTES.has(pathname)) {
      startTransition(() => {
        router.replace("/dashboard");
      });
      return;
    }

    if (!isAuthenticated && !PUBLIC_ROUTES.has(pathname)) {
      startTransition(() => {
        router.replace("/login");
      });
    }
  }, [isLoading, user, accessToken, pathname, router]);

  return null;
}
