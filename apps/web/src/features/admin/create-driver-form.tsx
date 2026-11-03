"use client";

import type { RideCategory } from "@ride/contracts";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminCities, useCreateDriver } from "@/hooks/use-admin";

const CATEGORY_LABEL: Record<RideCategory, string> = {
  economy: "Economy",
  comfort: "Comfort",
};

export function CreateDriverForm() {
  const cities = useAdminCities();
  const createDriver = useCreateDriver();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [cityId, setCityId] = useState("");
  const [vehicleCategory, setVehicleCategory] = useState<RideCategory | "">("");

  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    vehiclePlate.trim().length > 0 &&
    cityId !== "" &&
    vehicleCategory !== "";

  function resetForm() {
    setName("");
    setEmail("");
    setPhone("");
    setVehiclePlate("");
    setCityId("");
    setVehicleCategory("");
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    createDriver.mutate(
      {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        vehiclePlate: vehiclePlate.trim(),
        cityId,
        vehicleCategory: vehicleCategory as RideCategory,
      },
      { onSuccess: resetForm },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="driver-name">Name</Label>
            <Input
              id="driver-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="driver-email">Email</Label>
            <Input
              id="driver-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="driver-phone">Phone (optional)</Label>
            <Input
              id="driver-phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="driver-plate">Vehicle plate</Label>
            <Input
              id="driver-plate"
              value={vehiclePlate}
              onChange={(event) => setVehiclePlate(event.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="driver-city">City</Label>
            {cities.isLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <Select value={cityId} onValueChange={(value) => setCityId(value ?? "")}>
                <SelectTrigger id="driver-city" className="w-full">
                  <SelectValue placeholder="Select a city" />
                </SelectTrigger>
                <SelectContent>
                  {(cities.data?.cities ?? []).map((city) => (
                    <SelectItem key={city.id} value={city.id}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="driver-category">Vehicle category</Label>
            <Select
              value={vehicleCategory}
              onValueChange={(value) => setVehicleCategory((value ?? "") as RideCategory | "")}
            >
              <SelectTrigger id="driver-category" className="w-full">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button type="submit" disabled={!canSubmit || createDriver.isPending}>
          {createDriver.isPending ? "Adding driver…" : "Add driver"}
        </Button>
      </form>

      {createDriver.isError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <p>
            {createDriver.error instanceof Error
              ? createDriver.error.message
              : "Couldn't add this driver."}
          </p>
        </div>
      )}

      {createDriver.isSuccess && (
        <div className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm">
          <p className="font-medium">Driver {createDriver.data.driver.name} created.</p>
          <p className="mt-1">
            Temporary password (shown once, share it with the driver directly):{" "}
            <code className="rounded bg-background px-1.5 py-0.5 font-mono">
              {createDriver.data.temporaryPassword}
            </code>
          </p>
        </div>
      )}
    </div>
  );
}
