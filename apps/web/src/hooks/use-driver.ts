"use client";

import type { Ride, RideStatus } from "@ride/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

const TERMINAL_STATUSES: ReadonlySet<RideStatus> = new Set(["completed", "cancelled", "expired"]);
const POLL_INTERVAL_MS = 4000;

export function useDriverMe() {
  return useQuery({
    queryKey: ["driver", "me"],
    queryFn: () => apiClient.getDriverMe(),
  });
}

export function useUpdateDriverMe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (isOnline: boolean) => apiClient.updateDriverMe({ isOnline }),
    onSuccess: (data) => {
      queryClient.setQueryData(["driver", "me"], data);
    },
  });
}

export function useCurrentRide(enabled: boolean) {
  return useQuery({
    queryKey: ["driver", "rides", "current"],
    queryFn: () => apiClient.currentRide(),
    enabled,
    refetchInterval: (query) => {
      const ride = query.state.data?.ride as Ride | null | undefined;
      if (!ride) return POLL_INTERVAL_MS;
      return TERMINAL_STATUSES.has(ride.status) ? false : POLL_INTERVAL_MS;
    },
  });
}

export function useAvailableRides(enabled: boolean) {
  return useQuery({
    queryKey: ["driver", "rides", "available"],
    queryFn: () => apiClient.availableRides(),
    enabled,
    refetchInterval: enabled ? POLL_INTERVAL_MS : false,
  });
}
