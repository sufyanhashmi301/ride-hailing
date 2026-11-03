"use client";

import type { DriverAdmin, RideCategory } from "@ride/contracts";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAdminCities } from "@/hooks/use-admin";

const CATEGORY_LABEL: Record<RideCategory, string> = {
  economy: "Economy",
  comfort: "Comfort",
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export function DriverDetailDialog({
  driver,
  open,
  onOpenChange,
}: {
  driver: DriverAdmin | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const cities = useAdminCities();
  const cityName = cities.data?.cities.find((c) => c.id === driver?.cityId)?.name ?? driver?.cityId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{driver?.name}</DialogTitle>
          <DialogDescription>{driver?.email}</DialogDescription>
        </DialogHeader>
        {driver && (
          <div className="flex flex-col">
            <Field label="Phone" value={driver.phone ?? "—"} />
            <Field label="City" value={cityName ?? "—"} />
            <Field label="Vehicle category" value={CATEGORY_LABEL[driver.vehicleCategory]} />
            <Field label="Vehicle plate" value={driver.vehiclePlate} />
            <Field
              label="Online"
              value={
                <Badge variant={driver.isOnline ? "default" : "outline"}>
                  {driver.isOnline ? "Online" : "Offline"}
                </Badge>
              }
            />
            <Field
              label="Account status"
              value={
                <Badge variant={driver.isActive ? "secondary" : "destructive"}>
                  {driver.isActive ? "Active" : "Disabled"}
                </Badge>
              }
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
