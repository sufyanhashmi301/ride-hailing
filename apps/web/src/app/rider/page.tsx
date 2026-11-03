"use client";

import type { Ride } from "@ride/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RideRequestForm } from "@/features/rides/ride-request-form";
import { RideStatusCard } from "@/features/rides/ride-status-card";
import { useRide } from "@/hooks/use-ride";
import { apiClient } from "@/lib/api";

const TERMINAL_STATUSES = new Set(["completed", "cancelled", "expired"]);

export default function RiderPage() {
  const [rideId, setRideId] = useState<string | null>(null);
  const rideQuery = useRide(rideId);
  const queryClient = useQueryClient();

  const cancelRide = useMutation({
    mutationFn: () => apiClient.cancelRide(rideId as string),
    onSuccess: (ride) => {
      queryClient.setQueryData(["rides", rideId], ride);
    },
  });

  if (!rideId) {
    return (
      <div className="mx-auto max-w-xl">
        <RideRequestForm onRideCreated={(ride: Ride) => setRideId(ride.id)} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      {rideQuery.isLoading && <Skeleton className="h-64 w-full" />}

      {rideQuery.isError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <p>Couldn't load your ride.</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => rideQuery.refetch()}
          >
            Retry
          </Button>
        </div>
      )}

      {rideQuery.data && (
        <RideStatusCard
          ride={rideQuery.data}
          actions={
            TERMINAL_STATUSES.has(rideQuery.data.status) ? (
              <Button type="button" onClick={() => setRideId(null)}>
                Request another ride
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled={cancelRide.isPending}
                onClick={() => cancelRide.mutate()}
              >
                {cancelRide.isPending ? "Cancelling…" : "Cancel ride"}
              </Button>
            )
          }
        />
      )}
    </div>
  );
}
