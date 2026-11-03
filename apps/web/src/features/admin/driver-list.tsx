"use client";

import type { DriverAdmin } from "@ride/contracts";
import { EyeIcon, PowerIcon } from "lucide-react";
import { useState } from "react";
import { ConfirmationDialog } from "@/components/common/confirmation-dialog";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DriverDetailDialog } from "@/features/admin/driver-detail-dialog";
import { useAdminDrivers, useSetDriverActive } from "@/hooks/use-admin";

export function DriverList() {
  const drivers = useAdminDrivers();
  const setDriverActive = useSetDriverActive();
  const [detailDriver, setDetailDriver] = useState<DriverAdmin | null>(null);
  const [toggleTarget, setToggleTarget] = useState<DriverAdmin | null>(null);

  const rows = drivers.data?.drivers ?? [];

  const columns: DataTableColumn<DriverAdmin>[] = [
    {
      key: "name",
      header: "Driver",
      sortValue: (driver) => driver.name,
      cell: (driver) => (
        <div>
          <p className="font-medium">{driver.name}</p>
          <p className="text-xs text-muted-foreground">{driver.email}</p>
        </div>
      ),
    },
    {
      key: "vehicle",
      header: "Vehicle",
      sortValue: (driver) => driver.vehicleCategory,
      cell: (driver) => (
        <div>
          <p className="capitalize">{driver.vehicleCategory}</p>
          <p className="text-xs text-muted-foreground">{driver.vehiclePlate}</p>
        </div>
      ),
    },
    {
      key: "online",
      header: "Online",
      sortValue: (driver) => (driver.isOnline ? 1 : 0),
      cell: (driver) => (
        <Badge variant={driver.isOnline ? "default" : "outline"}>
          {driver.isOnline ? "Online" : "Offline"}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (driver) => (driver.isActive ? 1 : 0),
      cell: (driver) => (
        <Badge variant={driver.isActive ? "secondary" : "destructive"}>
          {driver.isActive ? "Active" : "Disabled"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (driver) => (
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="View driver details"
            onClick={() => setDetailDriver(driver)}
          >
            <EyeIcon className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={driver.isActive ? "Disable driver" : "Enable driver"}
            onClick={() => setToggleTarget(driver)}
          >
            <PowerIcon className="size-4" />
          </Button>
        </div>
      ),
      className: "w-28",
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(driver) => driver.userId}
        searchValue={(driver) => `${driver.name} ${driver.email} ${driver.vehiclePlate}`}
        searchPlaceholder="Search by name, email, or plate…"
        isLoading={drivers.isLoading}
        isError={drivers.isError}
        onRetry={() => drivers.refetch()}
        emptyTitle="No drivers yet"
        emptyDescription="Add your first driver to get started."
      />

      <DriverDetailDialog
        driver={detailDriver}
        open={detailDriver !== null}
        onOpenChange={(open) => !open && setDetailDriver(null)}
      />

      <ConfirmationDialog
        open={toggleTarget !== null}
        onOpenChange={(open) => !open && setToggleTarget(null)}
        title={toggleTarget?.isActive ? "Disable this driver?" : "Enable this driver?"}
        description={
          toggleTarget?.isActive
            ? `${toggleTarget?.name} will no longer be able to go online or accept rides.`
            : `${toggleTarget?.name} will be able to go online and accept rides again.`
        }
        confirmLabel={toggleTarget?.isActive ? "Disable" : "Enable"}
        variant={toggleTarget?.isActive ? "destructive" : "default"}
        isPending={setDriverActive.isPending}
        onConfirm={() => {
          if (!toggleTarget) return;
          setDriverActive.mutate(
            { id: toggleTarget.userId, isActive: !toggleTarget.isActive },
            { onSuccess: () => setToggleTarget(null) },
          );
        }}
      />
    </>
  );
}
