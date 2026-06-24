import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { AI } from "@/lib/paths";
import type { AiStatus, SystemHealth } from "@/types/api";

// Unauthenticated gateway probe — safe to call before login, and not subject
// to the AI feature-flag middleware (that only guards /v1/ai/*).
export function useSystemHealth() {
  return useQuery({
    queryKey: ["system", "health"],
    queryFn: () => api.get("health").json<SystemHealth>(),
    staleTime: Infinity,
    retry: false,
  });
}

// Whether this installation has the "ai" module enabled at all (Community vs
// Pro edition) — not whether an LLM is actually configured for it. Defaults
// to true while loading/on error so the upsell doesn't flash for the common
// case where AI is enabled.
export function useAiFeatureEnabled(): boolean {
  const health = useSystemHealth();
  return health.data ? health.data.features.includes("ai") : true;
}

// Whether an LLM is actually configured server-side. Only queried once the
// "ai" module itself is confirmed enabled — if it isn't, this would just 403.
function useLlmEnabled(moduleEnabled: boolean) {
  return useQuery({
    queryKey: ["system", "ai-status"],
    queryFn: () => api.get(`${AI}/status`).json<AiStatus>(),
    enabled: moduleEnabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

// Whether AI-powered actions (generate incipit, suggest tags, ...) can
// actually work right now — both the module is enabled AND an LLM is
// configured. Defaults to false while unknown/loading: hiding a button
// briefly is far less confusing than showing one that's guaranteed to fail.
export function useAiUsable(): boolean {
  const moduleEnabled = useAiFeatureEnabled();
  const llm = useLlmEnabled(moduleEnabled);
  return moduleEnabled && (llm.data?.llm_enabled ?? false);
}
