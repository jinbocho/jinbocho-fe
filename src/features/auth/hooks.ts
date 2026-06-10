import { useMutation } from "@tanstack/react-query";
import ky from "ky";
import { useEffect, useRef } from "react";

import { refreshOnce } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/features/auth/store";
import type {
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
  ResetPasswordRequest,
  TokenResponse,
} from "@/types/api";

const baseUrl = import.meta.env.VITE_API_BASE_URL;

// Bare client for the auth endpoints (no bearer/refresh hooks needed here).
const authApi = ky.create({ prefixUrl: baseUrl, retry: 0 });

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: async (body: LoginRequest) =>
      authApi.post("v1/auth/login", { json: body }).json<TokenResponse>(),
    onSuccess: (tokens) => {
      setSession(tokens.access_token, tokens.refresh_token);
    },
  });
}

export function useRegister() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    // Register returns no token, so we immediately log in with the same
    // credentials to obtain a session.
    mutationFn: async (body: RegisterRequest) => {
      await authApi
        .post("v1/auth/register", { json: body })
        .json<RegisterResponse>();
      return authApi
        .post("v1/auth/login", {
          json: { email: body.admin_email, password: body.admin_password },
        })
        .json<TokenResponse>();
    },
    onSuccess: (tokens) => {
      setSession(tokens.access_token, tokens.refresh_token);
    },
  });
}

export function useLogout() {
  const { refreshToken, clear } = useAuthStore.getState();
  return useMutation({
    mutationFn: async () => {
      if (refreshToken) {
        // Best-effort revoke; ignore network/HTTP errors on the way out.
        await authApi
          .post("v1/auth/logout", { json: { refresh_token: refreshToken } })
          .catch(() => undefined);
      }
    },
    onSettled: () => {
      clear();
      queryClient.clear();
    },
  });
}

export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: (body: ForgotPasswordRequest) =>
      authApi.post("v1/auth/forgot-password", { json: body }).then(() => undefined),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (body: ResetPasswordRequest) =>
      authApi.post("v1/auth/reset-password", { json: body }).then(() => undefined),
  });
}

// Runs once on app boot: if a refresh token was restored from localStorage,
// exchange it for an access token before guarded routes render.
export function useBootSession() {
  const status = useAuthStore((s) => s.status);
  const markUnauthenticated = useAuthStore((s) => s.markUnauthenticated);
  const clear = useAuthStore((s) => s.clear);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (status !== "loading") return;
    refreshOnce()
      .catch(() => clear())
      .finally(() => {
        // If refresh didn't authenticate us, settle as unauthenticated.
        if (useAuthStore.getState().status === "loading") markUnauthenticated();
      });
  }, [status, markUnauthenticated, clear]);

  return status;
}
