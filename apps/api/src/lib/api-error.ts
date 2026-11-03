import type { ErrorCode } from "@ride/contracts";

export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: ErrorCode,
    message: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function notFound(message = "Resource not found"): ApiError {
  return new ApiError(404, "NOT_FOUND", message);
}

export function forbidden(message = "You do not have access to this resource"): ApiError {
  return new ApiError(403, "FORBIDDEN", message);
}

export function unauthenticated(message = "Authentication required"): ApiError {
  return new ApiError(401, "UNAUTHENTICATED", message);
}

export function validationError(message: string, details?: Record<string, unknown>): ApiError {
  return new ApiError(400, "VALIDATION_ERROR", message, details);
}

export function outsideServiceArea(
  message = "Pickup or dropoff is outside the service area",
): ApiError {
  return new ApiError(400, "OUTSIDE_SERVICE_AREA", message);
}

export function activeRideExists(message = "You already have an active ride"): ApiError {
  return new ApiError(409, "ACTIVE_RIDE_EXISTS", message);
}

export function idempotencyKeyReused(
  message = "This idempotency key was already used with a different request body",
): ApiError {
  return new ApiError(409, "IDEMPOTENCY_KEY_REUSED", message);
}

export function rideAlreadyAccepted(message = "This ride has already been accepted"): ApiError {
  return new ApiError(409, "RIDE_ALREADY_ACCEPTED", message);
}

export function driverBusy(message = "You already have an active ride assignment"): ApiError {
  return new ApiError(409, "DRIVER_BUSY", message);
}

export function driverNotEligible(message = "You are not eligible to accept this ride"): ApiError {
  return new ApiError(422, "DRIVER_NOT_ELIGIBLE", message);
}

export function invalidTransition(from: string, to: string, action: string): ApiError {
  return new ApiError(409, "INVALID_TRANSITION", `Cannot ${action} a ride in status "${from}"`, {
    from,
    to,
    action,
  });
}
