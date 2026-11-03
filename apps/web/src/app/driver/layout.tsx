import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getSessionPayload } from "@/lib/session";

// This route reads the session cookie on every request (role guard) and shows live, per-user
// ride data -- there is nothing cacheable to prerender.
export const instant = false;

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionPayload();
  if (!session) redirect("/login");
  if (session.role !== "driver") redirect("/");

  return <AppShell>{children}</AppShell>;
}
