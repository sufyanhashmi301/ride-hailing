import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getSessionPayload } from "@/lib/session";

export const instant = false;

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionPayload();
  if (!session) redirect("/login");

  return <AppShell>{children}</AppShell>;
}
