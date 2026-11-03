import { z } from "zod";

export const IdSchema = z.uuid();

export const UserRoleSchema = z.enum(["rider", "driver", "admin"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const RideCategorySchema = z.enum(["economy", "comfort"]);
export type RideCategory = z.infer<typeof RideCategorySchema>;

export const RideStatusSchema = z.enum([
  "requested",
  "accepted",
  "completed",
  "cancelled",
  "expired",
]);
export type RideStatus = z.infer<typeof RideStatusSchema>;

export const GeoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type GeoPoint = z.infer<typeof GeoPointSchema>;

export const ErrorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "OUTSIDE_SERVICE_AREA",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "INVALID_TRANSITION",
  "RIDE_ALREADY_ACCEPTED",
  "ACTIVE_RIDE_EXISTS",
  "DRIVER_BUSY",
  "IDEMPOTENCY_KEY_REUSED",
  "DRIVER_NOT_ELIGIBLE",
  "EMAIL_ALREADY_EXISTS",
  "VEHICLE_PLATE_ALREADY_EXISTS",
  "RATE_LIMITED",
  "ERROR",
  "INTERNAL_ERROR",
]);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const ErrorEnvelopeSchema = z.object({
  error: z.object({
    code: ErrorCodeSchema,
    message: z.string(),
    details: z.record(z.string(), z.unknown()),
    requestId: z.string(),
  }),
});
export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;

export const OkResponseSchema = z.object({ ok: z.literal(true) });
export type OkResponse = z.infer<typeof OkResponseSchema>;
