import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { api } from "@/lib/api";
import { useAuthStore } from "@/features/auth/store";
import { USERS } from "@/lib/paths";
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
    mutationFn: (id: string) => api.delete(`${USERS}/${id}`).then(() => id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: userKeys.all }),
  });
}
