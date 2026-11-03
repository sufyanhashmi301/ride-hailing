"use client";

import type { Ride } from "@ride/contracts";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { PageHeader } from "@/components/common/page-header";
import { RideStatusBadge } from "@/features/rides/ride-status-badge";
import { useRideHistory } from "@/hooks/use-ride";

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

export default function RiderHistoryPage() {
  const rides = useRideHistory({ limit: 100 });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="My rides"
        description="Every ride you've requested."
        breadcrumbs={[{ label: "Dashboard", href: "/rider" }, { label: "My rides" }]}
      />

      <DataTable
        columns={columns}
        rows={rides.data?.rides ?? []}
        rowKey={(ride) => ride.id}
        pageSize={15}
        isLoading={rides.isLoading}
        isError={rides.isError}
        onRetry={() => rides.refetch()}
        emptyTitle="No rides yet"
        emptyDescription="Your ride history will show up here once you request one."
      />
    </div>
  );
}
