import { QueryClient } from "@tanstack/react-query";
import { HTTPError } from "ky";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Home-library data changes rarely; keep it fresh for a minute to cut
      // refetch chatter while still picking up edits reasonably fast.
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Never retry auth/permission/not-found — only transient failures.
        if (error instanceof HTTPError) {
          const status = error.response.status;
          if (status === 401 || status === 403 || status === 404) return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
