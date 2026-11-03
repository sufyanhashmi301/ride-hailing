import { describe, expect, it } from "vitest";
import { isWithinBounds } from "./geo.js";

const LAHORE = { minLat: 31.3, maxLat: 31.65, minLng: 74.15, maxLng: 74.5 };

describe("isWithinBounds", () => {
  it("accepts a point inside the box", () => {
    expect(isWithinBounds({ lat: 31.52, lng: 74.35 }, LAHORE)).toBe(true);
  });

  it("accepts a point exactly on the boundary", () => {
    expect(isWithinBounds({ lat: LAHORE.minLat, lng: LAHORE.minLng }, LAHORE)).toBe(true);
  });

  it("rejects a point outside the box", () => {
    expect(isWithinBounds({ lat: 24.86, lng: 67.01 }, LAHORE)).toBe(false);
  });

  it("rejects a point with latitude in range but longitude out of range", () => {
    expect(isWithinBounds({ lat: 31.5, lng: 80.0 }, LAHORE)).toBe(false);
  });
});
