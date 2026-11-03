"use client";

import { cn } from "cn";
import { ChevronsLeftIcon, ChevronsRightIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { NAV_SECTIONS } from "@/config/nav";
import { useAuth } from "@/hooks/use-auth";

const STORAGE_KEY = "ride-platform:sidebar-collapsed";

export function Sidebar() {
  const { data } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // ignore persistence failures
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore persistence failures
      }
      return next;
    });
  }

  const role = data?.user.role;
  const sections = role ? NAV_SECTIONS[role] : [];

  if (sections.length === 0) return null;

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        "hidden shrink-0 border-r border-border transition-[width] duration-150 md:flex md:flex-col",
        collapsed ? "md:w-16" : "md:w-56",
      )}
    >
      <nav className="flex flex-1 flex-col gap-4 p-3">
        {sections.map((section) => (
          <div key={section.label} className="flex flex-col gap-1">
            {!collapsed && (
              <p className="px-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {section.label}
              </p>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted",
                    active ? "bg-muted text-foreground" : "text-muted-foreground",
                    collapsed && "justify-center",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="border-t border-border p-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="w-full"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronsRightIcon className="size-4" />
          ) : (
            <ChevronsLeftIcon className="size-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}
