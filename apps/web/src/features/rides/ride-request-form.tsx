"use client";

import type { CategoryEstimate, Ride, RideCategory, RideLocation } from "@ride/contracts";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useIdempotencyKey } from "@/hooks/use-idempotency-key";
import { apiClient } from "@/lib/api";
import { FareSummary } from "./fare-summary";
import { PlaceAutocomplete } from "./place-autocomplete";

const CATEGORY_LABEL: Record<RideCategory, string> = {
  economy: "Economy",
  comfort: "Comfort",
};

export function RideRequestForm({ onRideCreated }: { onRideCreated: (ride: Ride) => void }) {
  const [pickup, setPickup] = useState<RideLocation | null>(null);
  const [dropoff, setDropoff] = useState<RideLocation | null>(null);
  const [category, setCategory] = useState<RideCategory | null>(null);
  const { getKey, resetKey } = useIdempotencyKey();

  const canEstimate = pickup !== null && dropoff !== null;

  const estimate = useMutation({
    mutationFn: () =>
      apiClient.estimate({ pickup: pickup as RideLocation, dropoff: dropoff as RideLocation }),
  });

  const createRide = useMutation({
    mutationFn: () =>
      apiClient.createRide(
        {
          category: category as RideCategory,
          pickup: pickup as RideLocation,
          dropoff: dropoff as RideLocation,
        },
        getKey(),
      ),
    onSuccess: (ride) => onRideCreated(ride),
  });

  function handlePickupChange(value: RideLocation | null) {
    setPickup(value);
    setCategory(null);
    resetKey();
    estimate.reset();
  }

  function handleDropoffChange(value: RideLocation | null) {
    setDropoff(value);
    setCategory(null);
    resetKey();
    estimate.reset();
  }

  function selectCategory(next: RideCategory) {
    setCategory(next);
    resetKey();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Where are you headed?</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <PlaceAutocomplete
          id="pickup"
          label="Pickup"
          value={pickup}
          onChange={handlePickupChange}
        />
        <PlaceAutocomplete
          id="dropoff"
          label="Dropoff"
          value={dropoff}
          onChange={handleDropoffChange}
        />

        <Button
          type="button"
          disabled={!canEstimate || estimate.isPending}
          onClick={() => estimate.mutate()}
        >
          {estimate.isPending ? "Getting estimate…" : "Get estimate"}
        </Button>

        {estimate.isPending && (
          <div className="grid gap-2 sm:grid-cols-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {estimate.isError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <p>
              {estimate.error instanceof Error
                ? estimate.error.message
                : "Couldn't get an estimate."}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => estimate.mutate()}
            >
              Retry
            </Button>
          </div>
        )}

        {estimate.isSuccess && (
          <div className="grid gap-2 sm:grid-cols-2">
            {estimate.data.estimates.map((option: CategoryEstimate) => (
              <button
                key={option.category}
                type="button"
                onClick={() => selectCategory(option.category)}
                className={`rounded-md border p-3 text-left transition-colors ${
                  category === option.category
                    ? "border-primary ring-2 ring-ring/50"
                    : "hover:bg-muted"
                }`}
              >
                <p className="text-sm font-medium">{CATEGORY_LABEL[option.category]}</p>
                <FareSummary fare={option.fare} />
                <p className="mt-1 text-xs text-muted-foreground">
                  {option.pickupEtaSeconds === null
                    ? "No drivers nearby right now"
                    : `Driver ~${Math.round(option.pickupEtaSeconds / 60)} min away`}
                </p>
              </button>
            ))}
          </div>
        )}

        {category && (
          <Button type="button" disabled={createRide.isPending} onClick={() => createRide.mutate()}>
            {createRide.isPending ? "Requesting…" : `Request ${CATEGORY_LABEL[category]}`}
          </Button>
        )}

        {createRide.isError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <p>
              {createRide.error instanceof Error
                ? createRide.error.message
                : "Couldn't request a ride."}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => createRide.mutate()}
            >
              Retry
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
