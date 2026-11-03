"use client";

import { LanguagesIcon } from "lucide-react";
import { useTranslation } from "@/components/common/language-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LOCALES } from "@/lib/i18n";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button type="button" variant="ghost" size="icon" aria-label={t("common.language")}>
            <LanguagesIcon className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent>
        {LOCALES.map((option) => (
          <DropdownMenuItem
            key={option.value}
            data-active={option.value === locale}
            className="data-[active=true]:font-medium"
            onClick={() => setLocale(option.value)}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
