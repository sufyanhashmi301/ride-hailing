import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getSessionPayload } from "@/lib/session";

// This route reads the session cookie on every request (role guard) and shows live, per-admin
// data -- there is nothing cacheable to prerender.
export const instant = false;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionPayload();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/");

  return <AppShell>{children}</AppShell>;
}
