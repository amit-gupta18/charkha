"use client";

import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import type { AuthResponse, User } from "@/lib/types";

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const PUBLIC_ROUTES = new Set(["/login", "/signup"]);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  async function refreshSession() {
    try {
      const data = await apiFetch<AuthResponse>("/api/auth/me");
      setUser(data.user);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
        if (!PUBLIC_ROUTES.has(pathname)) {
          startTransition(() => {
            router.replace("/login");
          });
        }
        return;
      }

      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    setIsLoading(true);
    void refreshSession();
  }, [pathname]);

  return <AuthContext.Provider value={{ user, isLoading, setUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
