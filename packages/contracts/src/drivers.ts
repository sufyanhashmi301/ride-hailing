import { z } from "zod";
import { IdSchema, RideCategorySchema } from "./common.js";

export const UpdateDriverMeRequestSchema = z.object({
  isOnline: z.boolean().optional(),
  lastLat: z.number().min(-90).max(90).optional(),
  lastLng: z.number().min(-180).max(180).optional(),
});
export type UpdateDriverMeRequest = z.infer<typeof UpdateDriverMeRequestSchema>;

export const DriverMeSchema = z.object({
  userId: IdSchema,
  cityId: IdSchema,
  vehicleCategory: RideCategorySchema,
  vehiclePlate: z.string(),
  isOnline: z.boolean(),
  lastLat: z.number().nullable(),
  lastLng: z.number().nullable(),
});
export type DriverMe = z.infer<typeof DriverMeSchema>;

export const DriverMeResponseSchema = z.object({
  driver: DriverMeSchema,
});
export type DriverMeResponse = z.infer<typeof DriverMeResponseSchema>;
