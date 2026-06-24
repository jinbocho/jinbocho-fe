import ky, { HTTPError, type KyInstance, type KyRequest } from "ky";

import { authStore, useAuthStore } from "@/features/auth/store";
import { decodeJwt, isExpired } from "@/lib/jwt";
import type { TokenResponse } from "@/types/api";

const baseUrl = import.meta.env.VITE_API_BASE_URL;
if (!baseUrl) {
  // Fail loud in dev; in prod the build-time inline should always provide it.
  console.warn("VITE_API_BASE_URL is not set — API calls will fail.");
}

// Auth endpoints must never trigger token refresh: a 401 here means bad
// credentials, not an expired session.
const AUTH_PATHS = ["v1/auth/login", "v1/auth/register", "v1/auth/refresh"];
function isAuthPath(url: string): boolean {
  return AUTH_PATHS.some((p) => url.includes(p));
}

// Bare client used ONLY to perform the refresh call — no auth hooks, so it can
// never recurse back into refresh logic.
const refreshClient = ky.create({ prefixUrl: baseUrl, retry: 0 });

// A single shared in-flight refresh promise. Concurrent 401s / expired-token
// requests all await the same refresh instead of stampeding the endpoint.
let refreshInFlight: Promise<string> | null = null;

async function performRefresh(): Promise<string> {
  const { refreshToken } = authStore.get();
  if (!refreshToken) throw new Error("No refresh token available");
  const tokens = await refreshClient
    .post("v1/auth/refresh", { json: { refresh_token: refreshToken } })
    .json<TokenResponse>();
  useAuthStore.getState().setSession(tokens.access_token, tokens.refresh_token);
  return tokens.access_token;
}

export function refreshOnce(): Promise<string> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

// Attaches a valid bearer token, refreshing PROACTIVELY when the current access
// token is missing or about to expire. This is the primary refresh mechanism —
// it means the 401 fallback below is only hit for tokens revoked mid-lifetime.
async function attachAuth(request: KyRequest): Promise<void> {
  if (isAuthPath(request.url)) return;
  let { accessToken } = authStore.get();
  const claims = accessToken ? decodeJwt(accessToken) : null;
  if (accessToken && (!claims || isExpired(claims)) && authStore.get().refreshToken) {
    try {
      accessToken = await refreshOnce();
    } catch {
      useAuthStore.getState().clear();
      accessToken = null;
    }
  }
  if (accessToken) {
    request.headers.set("Authorization", `Bearer ${accessToken}`);
  }
}

// Retry client: attaches auth but has NO 401 handler, so a retried request can
// resolve at most once and never loops.
const retryClient: KyInstance = ky.create({
  prefixUrl: baseUrl,
  retry: 0,
  hooks: { beforeRequest: [attachAuth] },
});

export const api: KyInstance = ky.create({
  prefixUrl: baseUrl,
  retry: 0,
  hooks: {
    beforeRequest: [attachAuth],
    afterResponse: [
      async (request, _options, response) => {
        if (response.status !== 401) return response;
        if (isAuthPath(request.url)) return response;
        if (!authStore.get().refreshToken) return response;
        try {
          await refreshOnce();
        } catch {
          useAuthStore.getState().clear();
          return response;
        }
        // Single retry through the no-401 client → guaranteed not to loop.
        return retryClient(request);
      },
    ],
  },
});

// The gateway gates every v1/ai/* route behind a feature flag and returns a
// plain 403 (not 401) when it's off — distinct from a "you lack permission"
// 403, since v1/ai/* never issues those for any other reason. Callers use
// this to show "AI isn't enabled" instead of a generic error toast.
export function isAiFeatureDisabledError(err: unknown): boolean {
  return err instanceof HTTPError && err.response.status === 403;
}

// LLM-backed endpoints (recommendations, incipit, tags) can legitimately take
// several seconds — recommendations scale with family size, since one call
// covers every member. ky's default is 10s, which a multi-member family can
// exceed: the client then aborts and discards the response, even though the
// backend goes on to finish (and persist) it seconds later. 30s matches the
// gateway's own upstream read timeout, so the two budgets agree.
export const AI_REQUEST_TIMEOUT_MS = 30_000;
