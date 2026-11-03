import type { UserRole } from "@ride/contracts";

export interface NavItem {
  label: string;
  href: string;
}

export const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  rider: [{ label: "Request a ride", href: "/rider" }],
  driver: [{ label: "Dashboard", href: "/driver" }],
  admin: [{ label: "Dashboard", href: "/admin" }],
};
