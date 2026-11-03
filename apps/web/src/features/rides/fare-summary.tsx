import type { FareEstimateDto } from "@ride/contracts";

export function FareSummary({ fare }: { fare: FareEstimateDto }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-lg font-semibold">Rs {fare.totalPkr}</p>
      <p className="text-xs text-muted-foreground">
        {(fare.distanceM / 1000).toFixed(1)} km · ~{Math.round(fare.durationS / 60)} min
      </p>
    </div>
  );
}
