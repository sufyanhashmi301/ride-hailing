"use client";

import type { Ride, RideStatus } from "@ride/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookingGuide } from "@/features/rides/booking-guide";
import { RideRequestForm } from "@/features/rides/ride-request-form";
import { RideStatusCard } from "@/features/rides/ride-status-card";
import { useRide, useRideHistory } from "@/hooks/use-ride";
import { apiClient } from "@/lib/api";

const TERMINAL_STATUSES: ReadonlySet<RideStatus> = new Set(["completed", "cancelled", "expired"]);
const ACTIVE_STATUSES: ReadonlySet<RideStatus> = new Set(["requested", "accepted"]);

export default function RiderBookPage() {
  const [rideId, setRideId] = useState<string | null>(null);
  const rideQuery = useRide(rideId);
  const queryClient = useQueryClient();

  // Local state alone forgets an active ride on refresh/navigation -- recover it from the
  // rider's own recent history so returning to this page doesn't lose track of it.
  const myRecentRides = useRideHistory({ limit: 5 });
  useEffect(() => {
    if (rideId !== null || !myRecentRides.data) return;
    const active = myRecentRides.data.rides.find((r) => ACTIVE_STATUSES.has(r.status));
    if (active) setRideId(active.id);
  }, [myRecentRides.data, rideId]);

  const cancelRide = useMutation({
    mutationFn: () => apiClient.cancelRide(rideId as string),
    onSuccess: (ride) => {
      queryClient.setQueryData(["rides", rideId], ride);
    },
    // e.g. 409 because the driver completed it first: show why, and refresh to the real status.
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["rides", rideId] });
    },
  });

  if (!rideId) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Request a ride"
          description="Where would you like to go?"
          breadcrumbs={[{ label: "Dashboard", href: "/rider" }, { label: "Book a ride" }]}
        />
        <div className="grid gap-6 lg:grid-cols-2">
          <RideRequestForm onRideCreated={(ride: Ride) => setRideId(ride.id)} />
          <BookingGuide />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Your ride"
        breadcrumbs={[{ label: "Dashboard", href: "/rider" }, { label: "Book a ride" }]}
      />
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

      {cancelRide.isError && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {cancelRide.error.message}
        </p>
      )}

      {rideQuery.data && (
        <RideStatusCard
          ride={rideQuery.data}
          actions={
            TERMINAL_STATUSES.has(rideQuery.data.status) ? (
              <Button
                type="button"
                onClick={() => {
                  cancelRide.reset();
                  setRideId(null);
                }}
              >
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
