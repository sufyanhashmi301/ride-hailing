"use client";

import { PlusIcon, UserCheckIcon, UsersIcon, WifiIcon } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { StatsCard } from "@/components/common/stats-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreateDriverForm } from "@/features/admin/create-driver-form";
import { DriverList } from "@/features/admin/driver-list";
import { useAdminDrivers } from "@/hooks/use-admin";

export default function AdminDriversPage() {
  const [addOpen, setAddOpen] = useState(false);
  const drivers = useAdminDrivers();
  const rows = drivers.data?.drivers ?? [];
  const activeCount = rows.filter((d) => d.isActive).length;
  const onlineCount = rows.filter((d) => d.isOnline).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Drivers"
        description="Manage who can drive on the platform."
        breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Drivers" }]}
        actions={
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger
              render={
                <Button type="button">
                  <PlusIcon className="size-4" />
                  Add driver
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add a driver</DialogTitle>
              </DialogHeader>
              <CreateDriverForm />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatsCard label="Total drivers" value={rows.length} icon={UsersIcon} />
        <StatsCard label="Active" value={activeCount} icon={UserCheckIcon} />
        <StatsCard label="Online now" value={onlineCount} icon={WifiIcon} />
      </div>

      <DriverList />
    </div>
  );
}
