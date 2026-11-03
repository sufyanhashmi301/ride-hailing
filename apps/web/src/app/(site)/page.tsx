import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-start gap-4 py-12">
      <h1 className="text-2xl font-semibold">Ride Platform</h1>
      <p className="text-muted-foreground">
        Request a ride across Lahore, or drive and earn on your own schedule.
      </p>
      <Link href="/login" className={buttonVariants()}>
        Log in
      </Link>
    </div>
  );
}
