"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AvailableRidesList } from "@/features/driver/available-rides-list";
import { OnlineToggle } from "@/features/driver/online-toggle";
import { RideStatusCard } from "@/features/rides/ride-status-card";
import { useCurrentRide, useDriverMe } from "@/hooks/use-driver";
import { apiClient } from "@/lib/api";

const TERMINAL_STATUSES = new Set(["completed", "cancelled", "expired"]);

export default function DriverPage() {
  const driverMe = useDriverMe();
  const currentRide = useCurrentRide(driverMe.isSuccess);
  const queryClient = useQueryClient();

  const completeRide = useMutation({
    mutationFn: (rideId: string) => apiClient.completeRide(rideId),
    onSuccess: (ride) => {
      queryClient.setQueryData(["driver", "rides", "current"], { ride });
    },
  });

  if (driverMe.isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }

  if (driverMe.isError || !driverMe.data) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
        <p>Couldn't load your driver profile.</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => driverMe.refetch()}
        >
          Retry
        </Button>
      </div>
    );
  }

  const ride = currentRide.data?.ride ?? null;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <OnlineToggle driver={driverMe.data.driver} />

      {ride ? (
        <RideStatusCard
          ride={ride}
          actions={
            TERMINAL_STATUSES.has(ride.status) ? null : (
              <Button
                type="button"
                disabled={completeRide.isPending}
                onClick={() => completeRide.mutate(ride.id)}
              >
                {completeRide.isPending ? "Completing…" : "Complete ride"}
              </Button>
            )
          }
        />
      ) : driverMe.data.driver.isOnline ? (
        <AvailableRidesList />
      ) : null}
    </div>
  );
}
