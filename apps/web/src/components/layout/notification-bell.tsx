"use client";

import { BellIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "@/components/common/language-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Sample, locally-generated notifications — there is no notifications backend yet. Clearly a
// UI-only placeholder so it never reads as live data.
const SAMPLE_NOTIFICATIONS = [
  { id: "1", title: "New ride request nearby", time: "2m ago" },
  { id: "2", title: "Ride #a93f completed", time: "1h ago" },
  { id: "3", title: "Driver application approved", time: "Yesterday" },
];

export function NotificationBell() {
  const { t } = useTranslation();
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const unreadCount = SAMPLE_NOTIFICATIONS.filter((n) => !readIds.has(n.id)).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="relative"
            aria-label={t("notifications.title")}
          >
            <BellIcon className="size-4" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-4 min-w-4 justify-center px-1 text-[10px]"
              >
                {unreadCount}
              </Badge>
            )}
          </Button>
        }
      />
      <DropdownMenuContent className="w-72">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">{t("notifications.title")}</DropdownMenuLabel>
          {unreadCount > 0 && (
            <button
              type="button"
              className="text-xs font-medium text-primary hover:underline"
              onClick={() => setReadIds(new Set(SAMPLE_NOTIFICATIONS.map((n) => n.id)))}
            >
              {t("notifications.markAllRead")}
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {SAMPLE_NOTIFICATIONS.map((notification) => (
          <button
            key={notification.id}
            type="button"
            onClick={() => setReadIds((prev) => new Set(prev).add(notification.id))}
            className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
          >
            <span
              className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary data-[read=true]:bg-transparent"
              data-read={readIds.has(notification.id)}
            />
            <span className="flex flex-col">
              <span>{notification.title}</span>
              <span className="text-xs text-muted-foreground">{notification.time}</span>
            </span>
          </button>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
