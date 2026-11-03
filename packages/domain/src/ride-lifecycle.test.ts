import { describe, expect, it } from "vitest";
import type { RideAction, RideStatus, RideStatusFields } from "./ride-lifecycle.js";
import { canTransition, InvalidRideTransitionError, transition } from "./ride-lifecycle.js";

const RIDER: { role: "rider"; userId: string } = { role: "rider", userId: "rider-1" };
const DRIVER: { role: "driver"; userId: string } = { role: "driver", userId: "driver-1" };
const ADMIN: { role: "admin"; userId: string } = { role: "admin", userId: "admin-1" };

function ride(status: RideStatus): RideStatusFields {
  return { status };
}

describe("canTransition", () => {
  const valid: Array<[RideStatus, RideStatus]> = [
    ["requested", "accepted"],
    ["requested", "cancelled"],
    ["requested", "expired"],
    ["accepted", "completed"],
    ["accepted", "cancelled"],
  ];

  it.each(valid)("allows %s -> %s", (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  const statuses: RideStatus[] = ["requested", "accepted", "completed", "cancelled", "expired"];
  const validSet = new Set(valid.map(([from, to]) => `${from}->${to}`));
  const invalid = statuses.flatMap((from) =>
    statuses
      .filter((to) => !validSet.has(`${from}->${to}`))
      .map((to): [RideStatus, RideStatus] => [from, to]),
  );

  it.each(invalid)("rejects %s -> %s", (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });
});

describe("transition", () => {
  it("accepts a requested ride and stamps acceptedAt", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const result = transition(ride("requested"), "accept", DRIVER, now);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.ride.status).toBe("accepted");
    expect(result.ride.acceptedAt).toBe(now);
  });

  it("completes an accepted ride and stamps completedAt", () => {
    const now = new Date("2026-01-01T00:10:00Z");
    const result = transition(ride("accepted"), "complete", DRIVER, now);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.ride.status).toBe("completed");
    expect(result.ride.completedAt).toBe(now);
  });

  it("cancels a requested ride and records who cancelled it", () => {
    const now = new Date("2026-01-01T00:05:00Z");
    const result = transition(ride("requested"), "cancel", RIDER, now);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.ride.status).toBe("cancelled");
    expect(result.ride.cancelledAt).toBe(now);
    expect(result.ride.cancelledBy).toBe(RIDER.userId);
  });

  it("cancels an accepted ride", () => {
    const result = transition(ride("accepted"), "cancel", ADMIN, new Date());
    expect(result.ok).toBe(true);
  });

  it("rejects completing a requested ride", () => {
    const result = transition(ride("requested"), "complete", DRIVER, new Date());

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected error");
    expect(result.error).toBeInstanceOf(InvalidRideTransitionError);
    expect(result.error.code).toBe("INVALID_TRANSITION");
    expect(result.error.from).toBe("requested");
    expect(result.error.to).toBe("completed");
  });

  it("rejects cancelling a completed ride", () => {
    const result = transition(ride("completed"), "cancel", ADMIN, new Date());
    expect(result.ok).toBe(false);
  });

  it("rejects accepting an already-accepted ride", () => {
    const result = transition(ride("accepted"), "accept", DRIVER, new Date());
    expect(result.ok).toBe(false);
  });

  it("rejects any transition out of a terminal state", () => {
    const terminal: RideStatus[] = ["completed", "cancelled", "expired"];
    const actions: RideAction[] = ["accept", "complete", "cancel", "expire"];

    for (const status of terminal) {
      for (const action of actions) {
        const result = transition(ride(status), action, DRIVER, new Date());
        expect(result.ok).toBe(false);
      }
    }
  });

  it("does not mutate the input ride", () => {
    const input = ride("requested");
    transition(input, "accept", DRIVER, new Date());
    expect(input.status).toBe("requested");
    expect(input.acceptedAt).toBeUndefined();
  });
});
