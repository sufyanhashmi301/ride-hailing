import { PageHeader } from "@/components/common/page-header";
import { AvailableRidesList } from "@/features/driver/available-rides-list";

export default function DriverRequestsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Ride requests"
        description="Pending rides you can accept right now. Go online from the dashboard to start seeing requests."
        breadcrumbs={[{ label: "Dashboard", href: "/driver" }, { label: "Ride requests" }]}
      />
      <AvailableRidesList />
    </div>
  );
}
