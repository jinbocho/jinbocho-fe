import { create } from "zustand";

import { decodeJwt } from "@/lib/jwt";
import type { Role } from "@/types/api";

const REFRESH_KEY = "jinbocho.refresh_token";

export interface SessionUser {
  id: string;
  email: string;
  familyId: string;
  role: Role;
}

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: SessionUser | null;
  status: AuthStatus;
  // Persist a fresh token pair and derive the user from the access token.
  setSession: (accessToken: string, refreshToken: string) => void;
  // Replace only the access token (after a silent refresh that kept the same pair shape).
  setAccessToken: (accessToken: string) => void;
  // Mark boot resolution when there is no stored refresh token.
  markUnauthenticated: () => void;
  clear: () => void;
}

function userFromToken(accessToken: string): SessionUser | null {
  const claims = decodeJwt(accessToken);
  if (!claims) return null;
  return {
    id: claims.sub,
    email: claims.email,
    familyId: claims.family_id,
    role: claims.role,
  };
}

// Access token is kept in memory only; refresh token is mirrored to
// localStorage so the session survives reloads. Documented trade-off: the
// gateway returns tokens in JSON (not httpOnly cookies), so this is the
// pragmatic choice — revisit if the backend later sets cookies.
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: localStorage.getItem(REFRESH_KEY),
  user: null,
  // If a refresh token exists we start in "loading" and resolve it on boot;
  // otherwise we are definitively unauthenticated.
  status: localStorage.getItem(REFRESH_KEY) ? "loading" : "unauthenticated",

  setSession: (accessToken, refreshToken) => {
    localStorage.setItem(REFRESH_KEY, refreshToken);
    set({
      accessToken,
      refreshToken,
      user: userFromToken(accessToken),
      status: "authenticated",
    });
  },

  setAccessToken: (accessToken) => {
    set({ accessToken, user: userFromToken(accessToken), status: "authenticated" });
  },

  markUnauthenticated: () => set({ status: "unauthenticated" }),

  clear: () => {
    localStorage.removeItem(REFRESH_KEY);
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      status: "unauthenticated",
    });
  },
}));

// Non-React accessors for the HTTP layer.
export const authStore = {
  get: () => useAuthStore.getState(),
};
