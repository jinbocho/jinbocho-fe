import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { WISHLIST } from "@/lib/paths";
import type { WishlistItem, WishlistItemCreate } from "@/types/api";

export const wishlistKeys = {
  all: ["wishlist"] as const,
};

export function useWishlist() {
  return useQuery({
    queryKey: wishlistKeys.all,
    queryFn: () => api.get(`${WISHLIST}/`).json<WishlistItem[]>(),
  });
}

export function useAddToWishlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: WishlistItemCreate) =>
      api.post(`${WISHLIST}/`, { json: body }).json<WishlistItem>(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: wishlistKeys.all });
    },
  });
}

export function useRemoveFromWishlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => api.delete(`${WISHLIST}/${itemId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: wishlistKeys.all });
    },
  });
}

