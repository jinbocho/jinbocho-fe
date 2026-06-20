import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { api } from "@/lib/api";
import { useAuthStore } from "@/features/auth/store";
import { CATALOG_MEMBERS, USERS } from "@/lib/paths";
import type { MeUpdate, User, UserCreate, UserUpdate } from "@/types/api";

// Calls /v1/users via the gateway (proxy added + validated end-to-end).

export const userKeys = {
  all: ["users"] as const,
  me: ["users", "me"] as const,
};

export function useCurrentUser() {
  return useQuery({
    queryKey: userKeys.me,
    queryFn: () => api.get(`${USERS}/me`).json<User>(),
  });
}

export function useUsers() {
  return useQuery({
    queryKey: userKeys.all,
    queryFn: () => api.get(`${USERS}/`).json<User[]>(),
  });
}

// Resolves a reader's user id to a display label: the translated "You" for
// self, the member's name otherwise, or null when nobody/unknown. Used to
// show who holds a book.
export function useReaderName(readerId: string | null): string | null {
  const users = useUsers();
  const myId = useAuthStore((s) => s.user?.id);
  const { t } = useTranslation();
  if (!readerId) return null;
  if (readerId === myId) return t("common.you");
  return users.data?.find((u) => u.id === readerId)?.full_name ?? null;
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UserCreate) => api.post(`${USERS}/`, { json: body }).json<User>(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: MeUpdate) => api.patch(`${USERS}/me`, { json: body }).json<User>(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: userKeys.me });
      void qc.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UserUpdate }) =>
      api.patch(`${USERS}/${id}`, { json: body }).json<User>(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (user: User) => {
      // Best-effort snapshot of the real identity before auth-service hard-
      // deletes the row for good — without it, a future export/import has no
      // way to recreate this person's account, only to leave their old
      // owner_id/current_reader_id/etc. references unresolved. Must never
      // block the actual deletion the admin asked for.
      try {
        await api.post(`${CATALOG_MEMBERS}/removed`, {
          json: { id: user.id, full_name: user.full_name, email: user.email, role: user.role },
        });
      } catch {
        // Deletion proceeds regardless — see comment above.
      }
      await api.delete(`${USERS}/${user.id}`);
      return user.id;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: userKeys.all }),
  });
}
