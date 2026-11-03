"use client";

import { CarIcon } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/components/common/language-provider";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { NotificationBell } from "@/components/layout/notification-bell";
import { ProfileDropdown } from "@/components/layout/profile-dropdown";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export function Header() {
  const { data, isLoading } = useAuth();
  const { t } = useTranslation();
  const user = data?.user;

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
      <Link href="/" className="flex items-center gap-2 font-semibold">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <CarIcon className="size-4" />
        </span>
        <span>{t("app.name")}</span>
      </Link>

      <div className="flex items-center gap-1">
        {!isLoading && user && (
          <>
            <LanguageSwitcher />
            <ThemeToggle />
            <NotificationBell />
            <span className="mx-1 h-6 w-px bg-border" aria-hidden="true" />
            <ProfileDropdown user={user} />
          </>
        )}
        {!isLoading && !user && (
          <>
            <LanguageSwitcher />
            <ThemeToggle />
            <Link href="/login" className={buttonVariants({ size: "sm", className: "ml-1" })}>
              {t("header.logIn")}
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
