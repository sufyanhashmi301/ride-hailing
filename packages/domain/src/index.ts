export type { DomainErrorCode } from "./errors.js";
export { DomainError } from "./errors.js";
export type { FareEstimate, GeoPoint, RidePackageRates } from "./fare.js";
export {
  AVG_SPEED_KMH,
  estimateFare,
  estimatePickupEtaSeconds,
  haversineDistanceMeters,
  ROAD_FACTOR,
  roadDistanceMeters,
  travelTimeSeconds,
} from "./fare.js";
export type {
  Actor,
  RideAction,
  RideStatus,
  RideStatusFields,
  TransitionResult,
} from "./ride-lifecycle.js";
export {
  canTransition,
  InvalidRideTransitionError,
  transition,
} from "./ride-lifecycle.js";
