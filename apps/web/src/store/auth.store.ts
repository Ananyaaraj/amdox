import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/lib/api";

interface User {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  role: string;
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setTokens: (access: string, refresh: string) => void;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post("/auth/login", { email, password });

          // FIX: The API wraps responses as { success, data, timestamp }
          // so the tokens are at data.data.accessToken, not data.accessToken
          const tokens = data.data;
          set({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            isLoading: false,
          });
          await get().fetchProfile();
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: () => {
        set({ user: null, accessToken: null, refreshToken: null });
        // FIX: Clear the auth cookie so Next.js middleware also sees the logout
        document.cookie = "amdox-token=; path=/; max-age=0; SameSite=Lax";
        window.location.href = "/auth/login";
      },

      setTokens: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken });
      },

      fetchProfile: async () => {
        try {
          const { data } = await api.get("/auth/profile");
          // FIX: Response is wrapped in { success, data }, so profile is at data.data
          const profile = data.data;
          set({
            user: {
              id: profile.id,
              email: profile.email,
              name: profile.name,
              tenantId: profile.tenants?.[0]?.tenantId || "",
              role: profile.tenants?.[0]?.role || "VIEWER",
              avatarUrl: profile.avatarUrl,
            },
          });
        } catch {
          set({ user: null });
        }
      },
    }),
    {
      name: "amdox-auth",
      partialize: (s) => ({ accessToken: s.accessToken, refreshToken: s.refreshToken }),
    }
  )
);
