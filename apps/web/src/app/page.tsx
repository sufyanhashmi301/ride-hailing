"use client";

import { useQuery } from "@tanstack/react-query";

interface HealthResponse {
  status: "ok" | "error";
  message?: string;
}

async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch("/api/v1/health/ready");
  if (!response.ok && response.status !== 503) {
    throw new Error(`Unexpected status ${response.status}`);
  }
  return response.json();
}

export default function Home() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["health", "ready"],
    queryFn: fetchHealth,
  });

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-xl font-semibold">Ride Platform</h1>
      {isLoading && <p className="text-muted-foreground">Checking API health…</p>}
      {isError && (
        <p className="text-destructive">
          Could not reach the API: {error instanceof Error ? error.message : "unknown error"}
        </p>
      )}
      {!isLoading && !isError && data?.status === "ok" && (
        <p className="text-green-600">API is ok</p>
      )}
      {!isLoading && !isError && data?.status === "error" && (
        <p className="text-destructive">API reports an error: {data.message}</p>
      )}
    </div>
  );
}
