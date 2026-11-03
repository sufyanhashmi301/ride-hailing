"use client";

import type { RideStatus } from "@ride/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CarIcon, CheckCircle2Icon, ZapIcon } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/common/page-header";
import { StatsCard } from "@/components/common/stats-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AvailableRidesList } from "@/features/driver/available-rides-list";
import { OnlineToggle } from "@/features/driver/online-toggle";
import { RideStatusCard } from "@/features/rides/ride-status-card";
import { useCurrentRide, useDriverMe, useDriverRideHistory } from "@/hooks/use-driver";
import { apiClient } from "@/lib/api";

const TERMINAL_STATUSES: ReadonlySet<RideStatus> = new Set(["completed", "cancelled", "expired"]);
const ACTIVE_STATUSES: ReadonlySet<RideStatus> = new Set(["requested", "accepted"]);

export default function DriverPage() {
  const driverMe = useDriverMe();
  const currentRide = useCurrentRide(driverMe.isSuccess);
  const history = useDriverRideHistory({ limit: 100 });
  const queryClient = useQueryClient();

  const historyRows = history.data?.rides ?? [];
  const completedCount = historyRows.filter((r) => r.status === "completed").length;
  const activeCount = historyRows.filter((r) => ACTIVE_STATUSES.has(r.status)).length;

  const completeRide = useMutation({
    mutationFn: (rideId: string) => apiClient.completeRide(rideId),
    onSuccess: (ride) => {
      queryClient.setQueryData(["driver", "rides", "current"], { ride });
    },
  });

  if (driverMe.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Dashboard" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (driverMe.isError || !driverMe.data) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Dashboard" />
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <p>Couldn't load your driver profile.</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => driverMe.refetch()}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const ride = currentRide.data?.ride ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="Go online to see ride requests."
        actions={
          <Link
            href="/driver/requests"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            View ride requests
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatsCard
          label="Total rides"
          value={history.isLoading ? "—" : historyRows.length}
          icon={CarIcon}
        />
        <StatsCard
          label="Completed"
          value={history.isLoading ? "—" : completedCount}
          icon={CheckCircle2Icon}
        />
        <StatsCard
          label="Active now"
          value={history.isLoading ? "—" : activeCount}
          icon={ZapIcon}
        />
      </div>

      <OnlineToggle driver={driverMe.data.driver} />

      {ride ? (
        <RideStatusCard
          ride={ride}
          actions={
            TERMINAL_STATUSES.has(ride.status) ? null : (
              <Button
                type="button"
                disabled={completeRide.isPending}
                onClick={() => completeRide.mutate(ride.id)}
              >
                {completeRide.isPending ? "Completing…" : "Complete ride"}
              </Button>
            )
          }
        />
      ) : driverMe.data.driver.isOnline ? (
        <AvailableRidesList />
      ) : null}
    </div>
  );
}
