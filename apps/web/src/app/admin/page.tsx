"use client";

import { CreateDriverForm } from "@/features/admin/create-driver-form";
import { DriverList } from "@/features/admin/driver-list";

export default function AdminPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <CreateDriverForm />
      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Drivers</h2>
        <DriverList />
      </div>
    </div>
  );
}
