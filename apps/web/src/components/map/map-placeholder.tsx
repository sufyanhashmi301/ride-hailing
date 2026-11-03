export interface MapViewProps {
  pickup?: { lat: number; lng: number; label?: string };
  dropoff?: { lat: number; lng: number; label?: string };
  driver?: { lat: number; lng: number };
}

// Same prop shape as the future Leaflet MapView, so swapping it in later touches no callers.
export function MapPlaceholder(_props: MapViewProps) {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-md border bg-muted text-sm text-muted-foreground">
      Map preview coming soon
    </div>
  );
}
