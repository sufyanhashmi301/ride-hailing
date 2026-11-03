"use client";

import type { Ride, RideStatus } from "@ride/contracts";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

const TERMINAL_STATUSES: ReadonlySet<RideStatus> = new Set(["completed", "cancelled", "expired"]);
const POLL_INTERVAL_MS = 4000;

export function useRide(rideId: string | null) {
  return useQuery({
    queryKey: ["rides", rideId],
    queryFn: () => apiClient.getRide(rideId as string),
    enabled: rideId !== null,
    refetchInterval: (query) => {
      const ride = query.state.data as Ride | undefined;
      if (!ride) return POLL_INTERVAL_MS;
      return TERMINAL_STATUSES.has(ride.status) ? false : POLL_INTERVAL_MS;
    },
  });
}
