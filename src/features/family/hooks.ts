import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuthStore } from "@/features/auth/store";
import { api } from "@/lib/api";
import { FAMILIES } from "@/lib/paths";
import type { Family, FamilyUpdate } from "@/types/api";

// Calls /v1/families via the gateway (proxy added + validated).
// The family id is read from the JWT in the auth store.

export const familyKeys = {
  detail: (id: string) => ["family", id] as const,
};

export function useFamily() {
  const familyId = useAuthStore((s) => s.user?.familyId);
  return useQuery({
    queryKey: familyKeys.detail(familyId ?? ""),
    queryFn: () => api.get(`${FAMILIES}/${familyId}`).json<Family>(),
    enabled: Boolean(familyId),
  });
}

export function useUpdateFamily() {
  const qc = useQueryClient();
  const familyId = useAuthStore((s) => s.user?.familyId);
  return useMutation({
    mutationFn: (body: FamilyUpdate) =>
      api.patch(`${FAMILIES}/${familyId}`, { json: body }).json<Family>(),
    onSuccess: (family) => {
      if (familyId) qc.setQueryData(familyKeys.detail(familyId), family);
    },
  });
}
