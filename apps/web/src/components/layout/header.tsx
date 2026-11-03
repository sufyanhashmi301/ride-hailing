"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLogout } from "@/hooks/use-logout";

export function Header() {
  const { data, isLoading } = useAuth();
  const logout = useLogout();
  const router = useRouter();
  const user = data?.user;

  async function handleLogout() {
    await logout.mutateAsync();
    router.push("/login");
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b px-4">
      <Link href="/" className="font-semibold">
        Ride Platform
      </Link>
      {!isLoading && user && (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">
            {user.name} · {user.role}
          </span>
          <Button variant="outline" size="sm" disabled={logout.isPending} onClick={handleLogout}>
            Log out
          </Button>
        </div>
      )}
      {!isLoading && !user && (
        <Link href="/login" className={buttonVariants({ size: "sm" })}>
          Log in
        </Link>
      )}
    </header>
  );
}
