"use client";

import type { Ride, RideStatus } from "@ride/contracts";
import { cn } from "cn";
import { useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { RideStatusBadge } from "@/features/rides/ride-status-badge";
import { useAdminRides } from "@/hooks/use-admin";

const STATUS_TABS: { label: string; value: RideStatus | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Requested", value: "requested" },
  { label: "Accepted", value: "accepted" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Expired", value: "expired" },
];

const columns: DataTableColumn<Ride>[] = [
  {
    key: "route",
    header: "Route",
    cell: (ride) => (
      <div>
        <p className="font-medium">{ride.pickup.label}</p>
        <p className="text-xs text-muted-foreground">→ {ride.dropoff.label}</p>
      </div>
    ),
  },
  {
    key: "category",
    header: "Category",
    sortValue: (ride) => ride.category,
    cell: (ride) => <span className="capitalize">{ride.category}</span>,
  },
  {
    key: "driver",
    header: "Driver",
    sortValue: (ride) => ride.driver?.name ?? "",
    cell: (ride) => ride.driver?.name ?? "—",
  },
  {
    key: "fare",
    header: "Fare",
    sortValue: (ride) => ride.fare.totalPkr,
    cell: (ride) => `Rs ${ride.fare.totalPkr.toLocaleString()}`,
  },
  {
    key: "status",
    header: "Status",
    sortValue: (ride) => ride.status,
    cell: (ride) => <RideStatusBadge status={ride.status} />,
  },
  {
    key: "requestedAt",
    header: "Requested",
    sortValue: (ride) => ride.requestedAt,
    cell: (ride) => new Date(ride.requestedAt).toLocaleString(),
  },
];

export default function AdminRidesPage() {
  const [status, setStatus] = useState<RideStatus | undefined>(undefined);
  const rides = useAdminRides({ status, limit: 100 });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Rides"
        description="All rides requested on the platform."
        breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Rides" }]}
      />

      <div className="flex flex-wrap gap-1 border-b border-border pb-2">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.label}
            type="button"
            variant="ghost"
            size="sm"
            className={cn(status === tab.value && "bg-muted text-foreground")}
            onClick={() => setStatus(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={rides.data?.rides ?? []}
        rowKey={(ride) => ride.id}
        searchValue={(ride) =>
          `${ride.pickup.label} ${ride.dropoff.label} ${ride.driver?.name ?? ""}`
        }
        searchPlaceholder="Search by location or driver…"
        pageSize={15}
        isLoading={rides.isLoading}
        isError={rides.isError}
        onRetry={() => rides.refetch()}
        emptyTitle="No rides"
        emptyDescription="No rides match this filter yet."
      />
    </div>
  );
}
