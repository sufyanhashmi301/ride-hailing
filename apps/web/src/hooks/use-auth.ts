"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export const AUTH_ME_QUERY_KEY = ["auth", "me"] as const;

export function useAuth() {
  return useQuery({
    queryKey: AUTH_ME_QUERY_KEY,
    queryFn: () => apiClient.me(),
    retry: false,
  });
}
