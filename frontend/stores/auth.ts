import { create } from "zustand";
import { clearRefreshToken, getRefreshToken, setRefreshToken } from "@/lib/auth-session";
import { refreshAccessToken } from "@/lib/api";
import { queryClient } from "@/lib/query/client";
import type { User } from "@/lib/types";

type AuthState = {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  setSession: (session: { user: User; accessToken: string; refreshToken: string }) => void;
  updateAccess: (user: User, accessToken: string) => void;
  clearSession: () => void;
  bootstrapSession: () => Promise<boolean>;
  handleSessionLost: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isLoading: true,

  setSession: ({ user, accessToken, refreshToken }) => {
    setRefreshToken(refreshToken);
    set({ user, accessToken });
  },

  updateAccess: (user, accessToken) => set({ user, accessToken }),

  clearSession: () => {
    clearRefreshToken();
    set({ user: null, accessToken: null });
    queryClient.clear();
  },

  handleSessionLost: () => {
    clearRefreshToken();
    set({ user: null, accessToken: null });
    queryClient.clear();
  },

  bootstrapSession: async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      set({ user: null, accessToken: null });
      return false;
    }

    const ok = await refreshAccessToken();
    if (!ok) {
      clearRefreshToken();
      set({ user: null, accessToken: null });
      return false;
    }

    return true;
  },
}));

/** Shorthand hook matching the old AuthProvider API. */
export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const accessToken = useAuthStore((s) => s.accessToken);
  return { user, isLoading, accessToken };
}
