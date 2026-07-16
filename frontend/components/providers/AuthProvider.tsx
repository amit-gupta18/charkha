"use client";

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch, ApiError, refreshSession } from "@/lib/api";
import { subscribeAuthEvents } from "@/lib/sessionSync";
import type { AuthResponse, User } from "@/lib/types";

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const PUBLIC_ROUTES = new Set(["/", "/login", "/signup"]);
const AUTH_ENTRY_ROUTES = new Set(["/login", "/signup"]);

const SESSION_REFRESH_MS = 45 * 60 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  const loadSession = useCallback(async (options?: { clearOnFailure?: boolean }) => {
    const clearOnFailure = options?.clearOnFailure ?? false;

    try {
      const data = await apiFetch<AuthResponse>("/api/auth/me");
      setUser(data.user);
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        const refreshed = await refreshSession();
        if (refreshed) {
          try {
            const data = await apiFetch<AuthResponse>("/api/auth/me");
            setUser(data.user);
            return true;
          } catch {
            if (clearOnFailure) setUser(null);
            return false;
          }
        }
        if (clearOnFailure) setUser(null);
        return false;
      }
      throw error;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        await loadSession({ clearOnFailure: true });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [loadSession]);

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
        setUser(null);
        return;
      }
      if (event.type === "login") {
        return;
      }
      void loadSession();
    });
  }, [loadSession]);

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

  return <AuthContext.Provider value={{ user, isLoading, setUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
