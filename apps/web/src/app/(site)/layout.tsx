import { AppShell } from "@/components/layout/app-shell";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
