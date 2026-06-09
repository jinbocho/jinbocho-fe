import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { api } from "@/lib/api";
import { RECORDS } from "@/lib/paths";
import type {
  BibliographicRecord,
  BibliographicRecordCreate,
  BibliographicRecordUpdate,
} from "@/types/api";

export const recordKeys = {
  all: ["records"] as const,
  list: (q: string, limit: number, offset: number) =>
    [...recordKeys.all, "list", { q, limit, offset }] as const,
  detail: (id: string) => [...recordKeys.all, "detail", id] as const,
};

export function useRecords(q = "", limit = 50, offset = 0) {
  return useQuery({
    queryKey: recordKeys.list(q, limit, offset),
    queryFn: () => {
      const searchParams: Record<string, string | number> = { limit, offset };
      if (q) searchParams.q = q;
      return api
        .get(`${RECORDS}/`, { searchParams })
        .json<BibliographicRecord[]>();
    },
  });
}

export function useRecord(id: string | undefined) {
  return useQuery({
    queryKey: recordKeys.detail(id ?? ""),
    queryFn: () => api.get(`${RECORDS}/${id}`).json<BibliographicRecord>(),
    enabled: Boolean(id),
  });
}

export function useCreateRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BibliographicRecordCreate) =>
      api.post(`${RECORDS}/`, { json: body }).json<BibliographicRecord>(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: recordKeys.all });
    },
  });
}

export function useUpdateRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: BibliographicRecordUpdate }) =>
      api.patch(`${RECORDS}/${id}`, { json: body }).json<BibliographicRecord>(),
    onSuccess: (record) => {
      qc.setQueryData(recordKeys.detail(record.id), record);
      void qc.invalidateQueries({ queryKey: recordKeys.all });
    },
  });
}

export function useDeleteRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`${RECORDS}/${id}`).then(() => id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: recordKeys.all });
    },
  });
}
