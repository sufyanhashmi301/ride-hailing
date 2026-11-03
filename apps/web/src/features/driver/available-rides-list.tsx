"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FareSummary } from "@/features/rides/fare-summary";
import { useAvailableRides } from "@/hooks/use-driver";
import { apiClient } from "@/lib/api";

export function AvailableRidesList() {
  const availableRides = useAvailableRides(true);
  const queryClient = useQueryClient();

  const acceptRide = useMutation({
    mutationFn: (rideId: string) => apiClient.acceptRide(rideId),
    onSuccess: (ride) => {
      queryClient.setQueryData(["driver", "rides", "current"], { ride });
      queryClient.invalidateQueries({ queryKey: ["driver", "rides", "available"] });
    },
    // A lost race (409 RIDE_ALREADY_ACCEPTED) means the list is stale: refresh it immediately.
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["driver", "rides", "available"] });
    },
  });

  if (availableRides.isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (availableRides.isError) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
        <p>Couldn't load available rides.</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => availableRides.refetch()}
        >
          Retry
        </Button>
      </div>
    );
  }

  const rides = availableRides.data?.rides ?? [];

  const acceptError = acceptRide.isError ? (
    <p
      role="alert"
      className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
    >
      {acceptRide.error.message}
    </p>
  ) : null;

  if (rides.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {acceptError}
        <p className="text-sm text-muted-foreground">No pending rides right now.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {acceptError}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rides.map((ride) => (
          <Card key={ride.id}>
            <CardContent className="flex flex-col gap-3">
              <div>
                <p className="text-sm font-medium">{ride.pickup.label}</p>
                <p className="text-xs text-muted-foreground">to {ride.dropoff.label}</p>
                <FareSummary fare={ride.fare} />
              </div>
              <Button
                type="button"
                disabled={acceptRide.isPending}
                onClick={() => acceptRide.mutate(ride.id)}
              >
                Accept
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
