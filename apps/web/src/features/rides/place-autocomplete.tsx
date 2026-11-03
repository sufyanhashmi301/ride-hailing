"use client";

import type { RideLocation } from "@ride/contracts";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api";

export interface PlaceAutocompleteProps {
  id: string;
  label: string;
  value: RideLocation | null;
  onChange: (value: RideLocation | null) => void;
}

export function PlaceAutocomplete({ id, label, value, onChange }: PlaceAutocompleteProps) {
  const [query, setQuery] = useState(value?.label ?? "");
  const [isOpen, setIsOpen] = useState(false);

  const { data, isFetching, isError } = useQuery({
    queryKey: ["places", query],
    queryFn: () => apiClient.places(query),
    enabled: isOpen && query.trim().length > 0,
  });

  const places = data?.places ?? [];

  return (
    <div className="relative flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={query}
        placeholder="Search a place in Lahore…"
        autoComplete="off"
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
          if (value) onChange(null);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 100)}
      />
      {isOpen && query.trim().length > 0 && (
        <div className="absolute top-full z-10 mt-1 w-full rounded-md border bg-popover shadow-md">
          {isFetching && (
            <div className="flex flex-col gap-1 p-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          )}
          {!isFetching && isError && (
            <p className="px-3 py-2 text-sm text-destructive">Couldn't search places</p>
          )}
          {!isFetching && !isError && places.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">No places found</p>
          )}
          {!isFetching &&
            places.map((place) => (
              <button
                key={place.id}
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange({ lat: place.lat, lng: place.lng, label: place.name });
                  setQuery(place.name);
                  setIsOpen(false);
                }}
              >
                {place.name}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
