import type { RideStatus } from "@ride/contracts";
import { Badge } from "@/components/ui/badge";

const STATUS_LABEL: Record<RideStatus, string> = {
  requested: "Finding a driver",
  accepted: "Driver on the way",
  completed: "Completed",
  cancelled: "Cancelled",
  expired: "Expired",
};

const STATUS_VARIANT: Record<RideStatus, "default" | "secondary" | "destructive" | "outline"> = {
  requested: "secondary",
  accepted: "default",
  completed: "outline",
  cancelled: "destructive",
  expired: "destructive",
};

export function RideStatusBadge({ status }: { status: RideStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}
