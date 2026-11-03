import { z } from "zod";
import { GeoPointSchema, IdSchema, RideCategorySchema, RideStatusSchema } from "./common.js";

export const RideLocationSchema = GeoPointSchema.extend({
  label: z.string().trim().min(1).max(200),
});
export type RideLocation = z.infer<typeof RideLocationSchema>;

export const FareEstimateSchema = z.object({
  distanceM: z.number().int().nonnegative(),
  durationS: z.number().int().nonnegative(),
  roadFactor: z.number(),
  avgSpeedKmh: z.number(),
  basePkr: z.number().int().nonnegative(),
  perKmPkr: z.number().int().nonnegative(),
  perMinPkr: z.number().int().nonnegative(),
  minFarePkr: z.number().int().nonnegative(),
  totalPkr: z.number().int().nonnegative(),
});
export type FareEstimateDto = z.infer<typeof FareEstimateSchema>;

export const EstimateRequestSchema = z
  .object({
    pickup: RideLocationSchema,
    dropoff: RideLocationSchema,
  })
  .refine((body) => body.pickup.lat !== body.dropoff.lat || body.pickup.lng !== body.dropoff.lng, {
    message: "pickup and dropoff must not be the same point",
    path: ["dropoff"],
  });
export type EstimateRequest = z.infer<typeof EstimateRequestSchema>;

export const CategoryEstimateSchema = z.object({
  category: RideCategorySchema,
  fare: FareEstimateSchema,
  pickupEtaSeconds: z.number().int().nonnegative().nullable(),
});
export type CategoryEstimate = z.infer<typeof CategoryEstimateSchema>;

export const EstimateResponseSchema = z.object({
  cityId: IdSchema,
  estimates: z.array(CategoryEstimateSchema),
});
export type EstimateResponse = z.infer<typeof EstimateResponseSchema>;

export const CreateRideRequestSchema = z
  .object({
    category: RideCategorySchema,
    pickup: RideLocationSchema,
    dropoff: RideLocationSchema,
  })
  .refine((body) => body.pickup.lat !== body.dropoff.lat || body.pickup.lng !== body.dropoff.lng, {
    message: "pickup and dropoff must not be the same point",
    path: ["dropoff"],
  });
export type CreateRideRequest = z.infer<typeof CreateRideRequestSchema>;

export const RideDriverSchema = z.object({
  id: IdSchema,
  name: z.string(),
  phone: z.string().nullable(),
  vehicleCategory: RideCategorySchema,
  vehiclePlate: z.string(),
});
export type RideDriver = z.infer<typeof RideDriverSchema>;

export const RideSchema = z.object({
  id: IdSchema,
  riderId: IdSchema,
  cityId: IdSchema,
  category: RideCategorySchema,
  status: RideStatusSchema,
  pickup: RideLocationSchema,
  dropoff: RideLocationSchema,
  fare: FareEstimateSchema,
  driver: RideDriverSchema.nullable(),
  requestedAt: z.iso.datetime(),
  acceptedAt: z.iso.datetime().nullable(),
  completedAt: z.iso.datetime().nullable(),
  cancelledAt: z.iso.datetime().nullable(),
  cancelledBy: IdSchema.nullable(),
  cancelReason: z.string().nullable(),
});
export type Ride = z.infer<typeof RideSchema>;

export const CancelRideRequestSchema = z.object({
  reason: z.string().trim().min(1).max(500).optional(),
});
export type CancelRideRequest = z.infer<typeof CancelRideRequestSchema>;

export const AvailableRideSchema = z.object({
  id: IdSchema,
  category: RideCategorySchema,
  pickup: RideLocationSchema,
  dropoff: RideLocationSchema,
  fare: FareEstimateSchema,
  requestedAt: z.iso.datetime(),
  pickupEtaSeconds: z.number().int().nonnegative().nullable(),
});
export type AvailableRide = z.infer<typeof AvailableRideSchema>;

export const AvailableRidesResponseSchema = z.object({
  rides: z.array(AvailableRideSchema),
});
export type AvailableRidesResponse = z.infer<typeof AvailableRidesResponseSchema>;

export const CurrentRideResponseSchema = z.object({
  ride: RideSchema.nullable(),
});
export type CurrentRideResponse = z.infer<typeof CurrentRideResponseSchema>;
