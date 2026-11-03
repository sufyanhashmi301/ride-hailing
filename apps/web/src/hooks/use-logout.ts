"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { AUTH_ME_QUERY_KEY } from "./use-auth";

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.logout(),
    onSuccess: () => {
      queryClient.setQueryData(AUTH_ME_QUERY_KEY, undefined);
      queryClient.removeQueries({ queryKey: AUTH_ME_QUERY_KEY });
    },
  });
}
