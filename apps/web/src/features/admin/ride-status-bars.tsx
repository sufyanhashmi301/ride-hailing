import type { RideStatus } from "@ride/contracts";

const STATUS_ORDER: RideStatus[] = ["requested", "accepted", "completed", "cancelled", "expired"];

const STATUS_LABEL: Record<RideStatus, string> = {
  requested: "Requested",
  accepted: "Accepted",
  completed: "Completed",
  cancelled: "Cancelled",
  expired: "Expired",
};

// Identity is carried by the visible label on every row, not by color, so this needs no
// categorical palette (and no colorblind-safety check) -- every bar shares one neutral fill.
export function RideStatusBars({ counts }: { counts: Record<RideStatus, number> }) {
  const max = Math.max(1, ...STATUS_ORDER.map((status) => counts[status]));

  return (
    <div className="flex flex-col gap-3">
      {STATUS_ORDER.map((status) => {
        const value = counts[status];
        const percent = Math.round((value / max) * 100);
        return (
          <div key={status} className="flex items-center gap-3 text-sm">
            <span className="w-24 shrink-0 text-muted-foreground">{STATUS_LABEL[status]}</span>
            <div
              className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
              title={`${STATUS_LABEL[status]}: ${value}`}
            >
              <div
                className="h-full rounded-full bg-foreground/70"
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="w-8 shrink-0 text-right font-medium tabular-nums">{value}</span>
          </div>
        );
      })}
    </div>
  );
}
