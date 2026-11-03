import { describe, expect, it } from "vitest";
import {
  AVG_SPEED_KMH,
  estimateFare,
  estimatePickupEtaSeconds,
  haversineDistanceMeters,
  ROAD_FACTOR,
  roadDistanceMeters,
} from "./fare.js";

// Liberty Roundabout, Lahore
const LIBERTY = { lat: 31.5204, lng: 74.3587 };
// Same point, ~0.01 degrees lat north (~1.1 km)
const NEARBY = { lat: 31.5304, lng: 74.3587 };

describe("haversineDistanceMeters", () => {
  it("returns 0 for identical points", () => {
    expect(haversineDistanceMeters(LIBERTY, LIBERTY)).toBe(0);
  });

  it("matches a known straight-line distance within 1%", () => {
    const distance = haversineDistanceMeters(LIBERTY, NEARBY);
    expect(distance).toBeGreaterThan(1_100);
    expect(distance).toBeLessThan(1_120);
  });

  it("is symmetric", () => {
    expect(haversineDistanceMeters(LIBERTY, NEARBY)).toBeCloseTo(
      haversineDistanceMeters(NEARBY, LIBERTY),
      6,
    );
  });
});

describe("roadDistanceMeters", () => {
  it("applies the road factor to the straight-line distance", () => {
    const straightLine = haversineDistanceMeters(LIBERTY, NEARBY);
    expect(roadDistanceMeters(LIBERTY, NEARBY)).toBeCloseTo(straightLine * ROAD_FACTOR, 6);
  });
});

describe("estimateFare", () => {
  const rates = { baseFarePkr: 100, perKmPkr: 30, perMinPkr: 5, minFarePkr: 150 };

  it("uses the metered fare when it exceeds the minimum", () => {
    const estimate = estimateFare(LIBERTY, NEARBY, rates);
    const distanceKm = estimate.distanceM / 1000;
    const durationMin = estimate.durationS / 60;
    const expectedMetered =
      rates.baseFarePkr + rates.perKmPkr * distanceKm + rates.perMinPkr * durationMin;

    expect(estimate.totalPkr).toBe(Math.round(Math.max(rates.minFarePkr, expectedMetered)));
    expect(estimate.totalPkr).toBeGreaterThan(rates.minFarePkr);
  });

  it("falls back to the minimum fare for a very short trip", () => {
    const closeBy = { lat: LIBERTY.lat + 0.0001, lng: LIBERTY.lng };
    const estimate = estimateFare(LIBERTY, closeBy, rates);
    expect(estimate.totalPkr).toBe(rates.minFarePkr);
  });

  it("returns integer PKR", () => {
    const estimate = estimateFare(LIBERTY, NEARBY, rates);
    expect(Number.isInteger(estimate.totalPkr)).toBe(true);
  });

  it("records the assumptions used in the snapshot", () => {
    const estimate = estimateFare(LIBERTY, NEARBY, rates);
    expect(estimate.roadFactor).toBe(ROAD_FACTOR);
    expect(estimate.avgSpeedKmh).toBe(AVG_SPEED_KMH);
    expect(estimate.basePkr).toBe(rates.baseFarePkr);
    expect(estimate.perKmPkr).toBe(rates.perKmPkr);
    expect(estimate.perMinPkr).toBe(rates.perMinPkr);
    expect(estimate.minFarePkr).toBe(rates.minFarePkr);
  });

  it("rejects negative fares (same pickup and dropoff still floors at minFare)", () => {
    const estimate = estimateFare(LIBERTY, LIBERTY, rates);
    expect(estimate.totalPkr).toBe(rates.minFarePkr);
  });
});

describe("estimatePickupEtaSeconds", () => {
  it("matches distance / speed with the road factor applied", () => {
    const eta = estimatePickupEtaSeconds(LIBERTY, NEARBY);
    const distanceKm = roadDistanceMeters(LIBERTY, NEARBY) / 1000;
    const expectedSeconds = Math.round((distanceKm / AVG_SPEED_KMH) * 3600);
    expect(eta).toBe(expectedSeconds);
  });

  it("returns 0 when the driver is already at the pickup point", () => {
    expect(estimatePickupEtaSeconds(LIBERTY, LIBERTY)).toBe(0);
  });
});
