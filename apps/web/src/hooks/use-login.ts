"use client";

import type { LoginRequest } from "@ride/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { AUTH_ME_QUERY_KEY } from "./use-auth";

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: LoginRequest) => apiClient.login(body),
    onSuccess: (data) => {
      queryClient.setQueryData(AUTH_ME_QUERY_KEY, { user: data.user });
    },
  });
}
