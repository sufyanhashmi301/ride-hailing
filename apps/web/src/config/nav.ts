import type { UserRole } from "@ride/contracts";
import { Car, HistoryIcon, LayoutDashboard, ListChecksIcon, UsersIcon } from "lucide-react";
import type { ComponentType } from "react";

export interface NavItem {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

// Each role's nav is built out as its pages go live (see the UI upgrade plan's phases) — only
// routes that actually exist are listed here.
export const NAV_SECTIONS: Record<UserRole, NavSection[]> = {
  rider: [
    {
      label: "Overview",
      items: [
        { label: "Dashboard", href: "/rider", icon: LayoutDashboard },
        { label: "Book a ride", href: "/rider/book", icon: Car },
      ],
    },
    {
      label: "Rides",
      items: [{ label: "My rides", href: "/rider/history", icon: HistoryIcon }],
    },
  ],
  driver: [
    {
      label: "Overview",
      items: [
        { label: "Dashboard", href: "/driver", icon: LayoutDashboard },
        { label: "Ride requests", href: "/driver/requests", icon: ListChecksIcon },
      ],
    },
    {
      label: "Rides",
      items: [{ label: "History", href: "/driver/history", icon: HistoryIcon }],
    },
  ],
  admin: [
    {
      label: "Overview",
      items: [{ label: "Dashboard", href: "/admin", icon: LayoutDashboard }],
    },
    {
      label: "Management",
      items: [
        { label: "Drivers", href: "/admin/drivers", icon: UsersIcon },
        { label: "Rides", href: "/admin/rides", icon: ListChecksIcon },
      ],
    },
  ],
};
