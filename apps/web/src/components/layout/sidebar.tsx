"use client";

import { cn } from "cn";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/config/nav";
import { useAuth } from "@/hooks/use-auth";

export function Sidebar() {
  const { data } = useAuth();
  const pathname = usePathname();
  const role = data?.user.role;
  const items = role ? NAV_ITEMS[role] : [];

  return (
    <aside className="hidden w-56 shrink-0 border-r md:block">
      {items.length > 0 && (
        <nav className="flex flex-col gap-1 p-4">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium hover:bg-muted",
                pathname === item.href && "bg-muted",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </aside>
  );
}
