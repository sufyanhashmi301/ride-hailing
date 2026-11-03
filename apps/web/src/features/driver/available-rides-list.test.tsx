import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { AvailableRidesList } from "./available-rides-list";

vi.mock("@/lib/api", () => ({
  apiClient: {
    availableRides: vi.fn(),
    acceptRide: vi.fn(),
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

const RIDE = {
  id: "ride-1",
  category: "economy" as const,
  pickup: { lat: 31.51, lng: 74.34, label: "Liberty Market" },
  dropoff: { lat: 31.47, lng: 74.36, label: "Packages Mall" },
  fare: FARE,
  requestedAt: new Date().toISOString(),
  pickupEtaSeconds: 180,
};

describe("AvailableRidesList", () => {
  beforeEach(() => {
    vi.mocked(apiClient.availableRides).mockReset();
    vi.mocked(apiClient.acceptRide).mockReset();
  });

  it("shows a loading skeleton while the request is in flight", () => {
    vi.mocked(apiClient.availableRides).mockReturnValue(new Promise(() => {}));

    renderWithQueryClient(<AvailableRidesList />);

    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });

  it("shows an error with a retry action when the request fails", async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.availableRides)
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce({ rides: [RIDE] });

    renderWithQueryClient(<AvailableRidesList />);

    expect(await screen.findByText("Couldn't load available rides.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Liberty Market")).toBeInTheDocument();
  });

  it("shows an empty state when there are no pending rides", async () => {
    vi.mocked(apiClient.availableRides).mockResolvedValue({ rides: [] });

    renderWithQueryClient(<AvailableRidesList />);

    expect(await screen.findByText("No pending rides right now.")).toBeInTheDocument();
  });

  it("lists pending rides and accepts one on click", async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.availableRides).mockResolvedValue({ rides: [RIDE] });
    vi.mocked(apiClient.acceptRide).mockResolvedValue({
      ...RIDE,
      riderId: "rider-1",
      cityId: "city-1",
      status: "accepted",
      driver: null,
      acceptedAt: new Date().toISOString(),
      completedAt: null,
      cancelledAt: null,
      cancelledBy: null,
      cancelReason: null,
    });

    renderWithQueryClient(<AvailableRidesList />);

    expect(await screen.findByText("Liberty Market")).toBeInTheDocument();
    expect(screen.getByText("to Packages Mall")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Accept" }));

    await waitFor(() => expect(apiClient.acceptRide).toHaveBeenCalledWith("ride-1"));
  });

  it("shows the server's message and refreshes the list when another driver won the ride", async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.availableRides)
      .mockResolvedValueOnce({ rides: [RIDE] })
      .mockResolvedValue({ rides: [] });
    vi.mocked(apiClient.acceptRide).mockRejectedValue(
      new Error("This ride has already been accepted"),
    );

    renderWithQueryClient(<AvailableRidesList />);

    await user.click(await screen.findByRole("button", { name: "Accept" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This ride has already been accepted",
    );
    expect(await screen.findByText("No pending rides right now.")).toBeInTheDocument();
    expect(screen.queryByText("Liberty Market")).not.toBeInTheDocument();
  });
});
