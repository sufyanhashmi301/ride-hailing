import { DomainError } from "./errors.js";

export type RideStatus = "requested" | "accepted" | "completed" | "cancelled" | "expired";
export type RideAction = "accept" | "complete" | "cancel" | "expire";

export interface Actor {
  role: "rider" | "driver" | "admin" | "system";
  userId: string;
}

export interface RideStatusFields {
  status: RideStatus;
  acceptedAt?: Date | null;
  completedAt?: Date | null;
  cancelledAt?: Date | null;
  cancelledBy?: string | null;
}

const ACTION_TARGET: Record<RideAction, RideStatus> = {
  accept: "accepted",
  complete: "completed",
  cancel: "cancelled",
  expire: "expired",
};

const ALLOWED_TRANSITIONS: ReadonlySet<`${RideStatus}->${RideStatus}`> = new Set([
  "requested->accepted",
  "requested->cancelled",
  "requested->expired",
  "accepted->completed",
  "accepted->cancelled",
]);

export function canTransition(from: RideStatus, to: RideStatus): boolean {
  return ALLOWED_TRANSITIONS.has(`${from}->${to}`);
}

export class InvalidRideTransitionError extends DomainError {
  readonly code = "INVALID_TRANSITION" as const;

  constructor(
    readonly from: RideStatus,
    readonly to: RideStatus,
    readonly action: RideAction,
  ) {
    super(`Cannot ${action} a ride in status "${from}"`);
    this.name = "InvalidRideTransitionError";
  }
}

export type TransitionResult<T extends RideStatusFields> =
  | { ok: true; ride: T }
  | { ok: false; error: InvalidRideTransitionError };

function patchFor(action: RideAction, actor: Actor, now: Date): Partial<RideStatusFields> {
  switch (action) {
    case "accept":
      return { acceptedAt: now };
    case "complete":
      return { completedAt: now };
    case "cancel":
      return { cancelledAt: now, cancelledBy: actor.userId };
    case "expire":
      return {};
  }
}

export function transition<T extends RideStatusFields>(
  ride: T,
  action: RideAction,
  actor: Actor,
  now: Date = new Date(),
): TransitionResult<T> {
  const to = ACTION_TARGET[action];
  if (!canTransition(ride.status, to)) {
    return { ok: false, error: new InvalidRideTransitionError(ride.status, to, action) };
  }

  return { ok: true, ride: { ...ride, status: to, ...patchFor(action, actor, now) } };
}
