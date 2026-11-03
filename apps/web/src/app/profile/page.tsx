"use client";

import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";

export default function ProfilePage() {
  const { data, isLoading, isError, refetch } = useAuth();
  const user = data?.user;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <PageHeader title="Profile" description="Your account details." />

      {isLoading && <Skeleton className="h-32 w-full" />}

      {isError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <p>Couldn't load your profile.</p>
          <button type="button" className="mt-2 underline" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      )}

      {user && (
        <Card>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Name</span>
              <span className="text-sm font-medium">{user.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Email</span>
              <span className="text-sm">{user.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Role</span>
              <Badge variant="secondary" className="capitalize">
                {user.role}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
