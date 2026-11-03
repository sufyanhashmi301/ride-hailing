import type { Ride } from "@ride/contracts";
import { MapPlaceholder } from "@/components/map/map-placeholder";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FareSummary } from "./fare-summary";
import { RideStatusBadge } from "./ride-status-badge";

export function RideStatusCard({ ride, actions }: { ride: Ride; actions?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{ride.category === "economy" ? "Economy" : "Comfort"} ride</CardTitle>
        <RideStatusBadge status={ride.status} />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="h-40">
          <MapPlaceholder pickup={ride.pickup} dropoff={ride.dropoff} driver={undefined} />
        </div>
        <div className="grid gap-1 text-sm">
          <p>
            <span className="text-muted-foreground">Pickup:</span> {ride.pickup.label}
          </p>
          <p>
            <span className="text-muted-foreground">Dropoff:</span> {ride.dropoff.label}
          </p>
        </div>
        <FareSummary fare={ride.fare} />
        {ride.driver && (
          <div className="rounded-md border p-3 text-sm">
            <p className="font-medium">{ride.driver.name}</p>
            <p className="text-muted-foreground">
              {ride.driver.vehicleCategory === "economy" ? "Economy" : "Comfort"} ·{" "}
              {ride.driver.vehiclePlate}
            </p>
            {ride.driver.phone && <p className="text-muted-foreground">{ride.driver.phone}</p>}
          </div>
        )}
        {actions}
      </CardContent>
    </Card>
  );
}
