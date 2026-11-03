"use client";

import { CarIcon, CheckCircle2Icon, UsersIcon, ZapIcon } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/common/page-header";
import { StatsCard } from "@/components/common/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RideStatusBars } from "@/features/admin/ride-status-bars";
import { RideStatusBadge } from "@/features/rides/ride-status-badge";
import { useAdminDrivers, useAdminRides, useAdminStats } from "@/hooks/use-admin";

export default function AdminDashboardPage() {
  const drivers = useAdminDrivers();
  const stats = useAdminStats();
  const recentRides = useAdminRides({ limit: 5 });

  const counts = stats.data?.rideStatusCounts;
  const totalRides = counts
    ? counts.requested + counts.accepted + counts.completed + counts.cancelled + counts.expired
    : undefined;
  const activeRides = counts ? counts.requested + counts.accepted : undefined;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Dashboard" description="An overview of the platform." />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Total drivers"
          value={drivers.data?.drivers.length ?? "—"}
          icon={UsersIcon}
        />
        <StatsCard label="Total rides" value={totalRides ?? "—"} icon={CarIcon} />
        <StatsCard label="Active rides" value={activeRides ?? "—"} icon={ZapIcon} />
        <StatsCard
          label="Completed rides"
          value={counts?.completed ?? "—"}
          icon={CheckCircle2Icon}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ride status</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.isLoading && <Skeleton className="h-40 w-full" />}
            {stats.isError && (
              <p className="text-sm text-muted-foreground">Couldn't load ride stats.</p>
            )}
            {counts && <RideStatusBars counts={counts} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent rides</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {recentRides.isLoading && (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            )}
            {recentRides.isError && (
              <p className="text-sm text-muted-foreground">Couldn't load recent rides.</p>
            )}
            {recentRides.data?.rides.length === 0 && (
              <p className="text-sm text-muted-foreground">No rides yet.</p>
            )}
            {recentRides.data?.rides.map((ride) => (
              <Link
                key={ride.id}
                href="/admin/rides"
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
      </div>
    </div>
  );
}
