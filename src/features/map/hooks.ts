import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { MAP } from "@/lib/paths";
import type { BookcaseMap } from "@/types/api";

export function useBookcaseMap(bookcaseId: string | undefined) {
  return useQuery({
    queryKey: ["map", "bookcase", bookcaseId],
    queryFn: () => api.get(`${MAP}/bookcase/${bookcaseId}`).json<BookcaseMap>(),
    enabled: Boolean(bookcaseId),
  });
}
