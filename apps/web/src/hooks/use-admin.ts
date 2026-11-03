"use client";

import type { AdminRideListQuery, CreateDriverRequest } from "@ride/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export function useAdminDrivers() {
  return useQuery({
    queryKey: ["admin", "drivers"],
    queryFn: () => apiClient.listDrivers(),
  });
}

export function useAdminCities() {
  return useQuery({
    queryKey: ["admin", "cities"],
    queryFn: () => apiClient.listCities(),
  });
}

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => apiClient.adminStats(),
  });
}

export function useAdminRides(query: Partial<AdminRideListQuery> = {}) {
  return useQuery({
    queryKey: ["admin", "rides", query],
    queryFn: () => apiClient.adminRides(query),
  });
}

export function useCreateDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateDriverRequest) => apiClient.createDriver(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "drivers"] });
    },
  });
}

export function useSetDriverActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient.setDriverActive(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "drivers"] });
    },
  });
}
