"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminDrivers, useSetDriverActive } from "@/hooks/use-admin";

export function DriverList() {
  const drivers = useAdminDrivers();
  const setDriverActive = useSetDriverActive();

  if (drivers.isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (drivers.isError) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
        <p>Couldn't load drivers.</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => drivers.refetch()}
        >
          Retry
        </Button>
      </div>
    );
  }

  const rows = drivers.data?.drivers ?? [];

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No drivers yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((driver) => (
        <Card key={driver.userId}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{driver.name}</p>
                <Badge variant={driver.isActive ? "secondary" : "destructive"}>
                  {driver.isActive ? "Active" : "Disabled"}
                </Badge>
                <Badge variant={driver.isOnline ? "default" : "outline"}>
                  {driver.isOnline ? "Online" : "Offline"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {driver.email} · {driver.vehicleCategory} · {driver.vehiclePlate}
              </p>
            </div>
            <Button
              type="button"
              variant={driver.isActive ? "outline" : "default"}
              disabled={setDriverActive.isPending}
              onClick={() =>
                setDriverActive.mutate({ id: driver.userId, isActive: !driver.isActive })
              }
            >
              {driver.isActive ? "Disable" : "Enable"}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
