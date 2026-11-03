"use client";

import type { DriverMe } from "@ride/contracts";
import { Button } from "@/components/ui/button";
import { useUpdateDriverMe } from "@/hooks/use-driver";

export function OnlineToggle({ driver }: { driver: DriverMe }) {
  const updateDriverMe = useUpdateDriverMe();

  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <div>
        <p className="text-sm font-medium">
          {driver.isOnline ? "You're online" : "You're offline"}
        </p>
        <p className="text-xs text-muted-foreground">
          {driver.isOnline ? "You'll see pending rides below." : "Go online to see pending rides."}
        </p>
      </div>
      <Button
        type="button"
        variant={driver.isOnline ? "outline" : "default"}
        disabled={updateDriverMe.isPending}
        onClick={() => updateDriverMe.mutate(!driver.isOnline)}
      >
        {driver.isOnline ? "Go offline" : "Go online"}
      </Button>
    </div>
  );
}
