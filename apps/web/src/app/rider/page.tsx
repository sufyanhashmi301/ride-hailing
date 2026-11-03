"use client";

import type { RideStatus } from "@ride/contracts";
import { CarIcon, CheckCircle2Icon, PlusIcon, XCircleIcon } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/common/page-header";
import { StatsCard } from "@/components/common/stats-card";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RideStatusBadge } from "@/features/rides/ride-status-badge";
import { useRideHistory } from "@/hooks/use-ride";

const ACTIVE_STATUSES: ReadonlySet<RideStatus> = new Set(["requested", "accepted"]);

export default function RiderDashboardPage() {
  const rides = useRideHistory({ limit: 20 });
  const rows = rides.data?.rides ?? [];
  const activeRide = rows.find((ride) => ACTIVE_STATUSES.has(ride.status));
  const completedCount = rows.filter((ride) => ride.status === "completed").length;
  const cancelledCount = rows.filter((ride) => ride.status === "cancelled").length;

  const recentRidesCard = (
    <Card>
      <CardHeader>
        <CardTitle>Recent rides</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {rides.isLoading && (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}
        {rides.isError && (
          <p className="text-sm text-muted-foreground">Couldn't load your rides.</p>
        )}
        {!rides.isLoading && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No rides yet. Book your first ride to get started.
          </p>
        )}
        {rows.slice(0, 5).map((ride) => (
          <Link
            key={ride.id}
            href="/rider/history"
            className="flex items-center justify-between gap-3 rounded-md px-1 py-2 text-sm hover:bg-muted/50"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{ride.pickup.label}</p>
              <p className="truncate text-xs text-muted-foreground">{ride.dropoff.label}</p>
            </div>
            <RideStatusBadge status={ride.status} />
          </Link>
        ))}
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="An overview of your rides."
        actions={
          <Link href="/rider/book" className={buttonVariants()}>
            <PlusIcon className="size-4" />
            Book a ride
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatsCard label="Total rides" value={rides.isLoading ? "—" : rows.length} icon={CarIcon} />
        <StatsCard
          label="Completed"
          value={rides.isLoading ? "—" : completedCount}
          icon={CheckCircle2Icon}
        />
        <StatsCard
          label="Cancelled"
          value={rides.isLoading ? "—" : cancelledCount}
          icon={XCircleIcon}
        />
      </div>

      {activeRide ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Active ride</CardTitle>
              <RideStatusBadge status={activeRide.status} />
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{activeRide.pickup.label}</p>
                <p className="truncate text-xs text-muted-foreground">
                  → {activeRide.dropoff.label}
                </p>
              </div>
              <Link
                href="/rider/book"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Track ride
              </Link>
            </CardContent>
          </Card>
          {recentRidesCard}
        </div>
      ) : (
        recentRidesCard
      )}
    </div>
  );
}
