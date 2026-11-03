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
  });

  if (availableRides.isLoading) {
    return (
      <div className="flex flex-col gap-2">
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

  if (rides.length === 0) {
    return <p className="text-sm text-muted-foreground">No pending rides right now.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {rides.map((ride) => (
        <Card key={ride.id}>
          <CardContent className="flex items-center justify-between gap-4">
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
  );
}
