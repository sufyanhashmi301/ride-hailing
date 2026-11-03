import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { RideRequestForm } from "./ride-request-form";

vi.mock("@/lib/api", () => ({
  apiClient: {
    places: vi.fn(),
    estimate: vi.fn(),
    createRide: vi.fn(),
  },
}));

const { apiClient } = await import("@/lib/api");

const FARE = {
  distanceM: 5000,
  durationS: 600,
  roadFactor: 1.3,
  avgSpeedKmh: 25,
  basePkr: 100,
  perKmPkr: 30,
  perMinPkr: 5,
  minFarePkr: 150,
  totalPkr: 280,
};

async function pickPlace(
  user: ReturnType<typeof userEvent.setup>,
  inputLabel: string,
  name: string,
) {
  const input = screen.getByLabelText(inputLabel);
  await user.type(input, name);
  const option = await screen.findByRole("button", { name });
  await user.click(option);
}

describe("RideRequestForm", () => {
  beforeEach(() => {
    vi.mocked(apiClient.places)
      .mockReset()
      .mockResolvedValue({
        places: [{ id: "place-1", name: "Liberty Market", lat: 31.51, lng: 74.34 }],
      });
    vi.mocked(apiClient.estimate).mockReset();
    vi.mocked(apiClient.createRide).mockReset();
  });

  it("shows a loading skeleton while the estimate request is in flight", async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.estimate).mockReturnValue(new Promise(() => {}));

    renderWithQueryClient(<RideRequestForm onRideCreated={vi.fn()} />);

    await pickPlace(user, "Pickup", "Liberty Market");
    await pickPlace(user, "Dropoff", "Liberty Market");
    await user.click(screen.getByRole("button", { name: "Get estimate" }));

    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });

  it("shows an error with a retry action when the estimate request fails", async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.estimate)
      .mockRejectedValueOnce(new Error("Couldn't reach the server"))
      .mockResolvedValueOnce({
        cityId: "city-1",
        estimates: [{ category: "economy", fare: FARE, pickupEtaSeconds: 180 }],
      });

    renderWithQueryClient(<RideRequestForm onRideCreated={vi.fn()} />);

    await pickPlace(user, "Pickup", "Liberty Market");
    await pickPlace(user, "Dropoff", "Liberty Market");
    await user.click(screen.getByRole("button", { name: "Get estimate" }));

    expect(await screen.findByText("Couldn't reach the server")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Rs 280")).toBeInTheDocument();
  });

  it("shows an error with a retry action when creating the ride fails", async () => {
    const user = userEvent.setup();
    const onRideCreated = vi.fn();
    vi.mocked(apiClient.estimate).mockResolvedValue({
      cityId: "city-1",
      estimates: [{ category: "economy", fare: FARE, pickupEtaSeconds: 180 }],
    });
    vi.mocked(apiClient.createRide).mockRejectedValueOnce(new Error("No drivers available"));

    renderWithQueryClient(<RideRequestForm onRideCreated={onRideCreated} />);

    await pickPlace(user, "Pickup", "Liberty Market");
    await pickPlace(user, "Dropoff", "Liberty Market");
    await user.click(screen.getByRole("button", { name: "Get estimate" }));
    await user.click(await screen.findByText("Economy"));
    await user.click(screen.getByRole("button", { name: "Request Economy" }));

    expect(await screen.findByText("No drivers available")).toBeInTheDocument();
    expect(onRideCreated).not.toHaveBeenCalled();

    await waitFor(() => expect(apiClient.createRide).toHaveBeenCalledTimes(1));
  });
});
