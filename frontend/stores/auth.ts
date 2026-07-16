import { create } from "zustand";
import { apiFetch, ApiError, refreshSession } from "@/lib/api";
import { queryClient } from "@/lib/query/client";
import type { AuthResponse, User } from "@/lib/types";

type AuthState = {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (isLoading: boolean) => void;
  clearUser: () => void;
  loadSession: (options?: { clearOnFailure?: boolean }) => Promise<boolean>;
  /** After login/register — verify cookies, set user, prep query cache. */
  completeLogin: () => Promise<User>;
  /** Clear user + query cache when session is permanently lost. */
  handleSessionLost: () => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,

  setUser: (user) => set({ user }),

  setLoading: (isLoading) => set({ isLoading }),

  clearUser: () => set({ user: null }),

  handleSessionLost: () => {
    set({ user: null });
    queryClient.clear();
  },

  loadSession: async (options) => {
    const clearOnFailure = options?.clearOnFailure ?? false;

    try {
      const data = await apiFetch<AuthResponse>("/api/auth/me");
      set({ user: data.user });
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        const refreshed = await refreshSession();
        if (refreshed) {
          try {
            const data = await apiFetch<AuthResponse>("/api/auth/me");
            set({ user: data.user });
            return true;
          } catch {
            if (clearOnFailure) set({ user: null });
            return false;
          }
        }
        if (clearOnFailure) set({ user: null });
        return false;
      }
      throw error;
    }
  },

  completeLogin: async () => {
    const ok = await get().loadSession({ clearOnFailure: true });
    if (!ok) {
      throw new ApiError("Session could not be established after login.", 401);
    }
    const user = get().user;
    if (!user) {
      throw new ApiError("Session could not be established.", 401);
    }
    await queryClient.invalidateQueries();
    return user;
  },
}));

/** Shorthand hook matching the old AuthProvider API. */
export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const setUser = useAuthStore((s) => s.setUser);
  return { user, isLoading, setUser };
}
