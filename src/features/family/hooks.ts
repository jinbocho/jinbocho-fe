import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuthStore } from "@/features/auth/store";
import { api } from "@/lib/api";
import { CATALOG_ACCOUNT, FAMILIES } from "@/lib/paths";
import type { DeleteFamilyDataResponse, DeleteFamilyRequest, Family, FamilyUpdate } from "@/types/api";

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

// Which step of the irreversible full-account deletion failed:
//  - "confirm": nothing happened yet — wrong password or family name.
//  - "catalog": the family/users still exist; safe to retry the whole thing.
//  - "family": the library is already gone but the account survives; the
//    admin can sign in and retry just this step (confirm-deletion + delete).
export class DeleteAccountStepError extends Error {
  constructor(public readonly step: "confirm" | "catalog" | "family", public readonly cause: unknown) {
    super(`Account deletion failed during the ${step} step`);
  }
}

// Admin-only, irreversible: wipes the catalog-service library data first
// (recoverable if it fails — the family/users still exist), then deletes the
// family in auth-service (cascades every user/token), then clears the local
// session — RequireAuth picks up the cleared status and redirects to /login.
export function useDeleteFamilyAccount() {
  const qc = useQueryClient();
  const familyId = useAuthStore((s) => s.user?.familyId);
  const clear = useAuthStore((s) => s.clear);
  const [isDeleting, setIsDeleting] = useState(false);

  async function deleteAccount(body: DeleteFamilyRequest): Promise<void> {
    setIsDeleting(true);
    try {
      try {
        await api.post(`${FAMILIES}/${familyId}/confirm-deletion`, { json: body });
      } catch (err) {
        throw new DeleteAccountStepError("confirm", err);
      }

      try {
        await api.delete(`${CATALOG_ACCOUNT}/`).json<DeleteFamilyDataResponse>();
      } catch (err) {
        throw new DeleteAccountStepError("catalog", err);
      }

      try {
        await api.delete(`${FAMILIES}/${familyId}`, { json: body });
      } catch (err) {
        throw new DeleteAccountStepError("family", err);
      }

      clear();
      qc.clear();
    } finally {
      setIsDeleting(false);
    }
  }

  return { deleteAccount, isDeleting };
}
