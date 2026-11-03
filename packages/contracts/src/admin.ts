import { z } from "zod";
import { IdSchema, RideCategorySchema, RideStatusSchema } from "./common.js";
import { RideSchema } from "./rides.js";

export const CreateDriverRequestSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.email(),
  phone: z.string().trim().min(1).max(32).optional(),
  cityId: IdSchema,
  vehicleCategory: RideCategorySchema,
  vehiclePlate: z.string().trim().min(1).max(32),
});
export type CreateDriverRequest = z.infer<typeof CreateDriverRequestSchema>;

export const DriverAdminSchema = z.object({
  userId: IdSchema,
  name: z.string(),
  email: z.email(),
  phone: z.string().nullable(),
  isActive: z.boolean(),
  cityId: IdSchema,
  vehicleCategory: RideCategorySchema,
  vehiclePlate: z.string(),
  isOnline: z.boolean(),
});
export type DriverAdmin = z.infer<typeof DriverAdminSchema>;

export const CreateDriverResponseSchema = z.object({
  driver: DriverAdminSchema,
  temporaryPassword: z.string(),
});
export type CreateDriverResponse = z.infer<typeof CreateDriverResponseSchema>;

export const UpdateDriverStatusRequestSchema = z.object({
  isActive: z.boolean(),
});
export type UpdateDriverStatusRequest = z.infer<typeof UpdateDriverStatusRequestSchema>;

export const UpdateDriverStatusResponseSchema = z.object({
  driver: DriverAdminSchema,
});
export type UpdateDriverStatusResponse = z.infer<typeof UpdateDriverStatusResponseSchema>;

export const AdminDriversResponseSchema = z.object({
  drivers: z.array(DriverAdminSchema),
});
export type AdminDriversResponse = z.infer<typeof AdminDriversResponseSchema>;

export const AdminCitySchema = z.object({
  id: IdSchema,
  name: z.string(),
});
export type AdminCity = z.infer<typeof AdminCitySchema>;

export const AdminCitiesResponseSchema = z.object({
  cities: z.array(AdminCitySchema),
});
export type AdminCitiesResponse = z.infer<typeof AdminCitiesResponseSchema>;

export const RidePackageSchema = z.object({
  id: IdSchema,
  cityId: IdSchema,
  category: RideCategorySchema,
  baseFarePkr: z.number().int().nonnegative(),
  perKmPkr: z.number().int().nonnegative(),
  perMinPkr: z.number().int().nonnegative(),
  minFarePkr: z.number().int().nonnegative(),
  isActive: z.boolean(),
});
export type RidePackageDto = z.infer<typeof RidePackageSchema>;

export const UpdatePackageRequestSchema = z
  .object({
    baseFarePkr: z.number().int().nonnegative().optional(),
    perKmPkr: z.number().int().nonnegative().optional(),
    perMinPkr: z.number().int().nonnegative().optional(),
    minFarePkr: z.number().int().nonnegative().optional(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    message: "At least one field must be provided",
  });
export type UpdatePackageRequest = z.infer<typeof UpdatePackageRequestSchema>;

export const UpdatePackageResponseSchema = z.object({
  package: RidePackageSchema,
});
export type UpdatePackageResponse = z.infer<typeof UpdatePackageResponseSchema>;

export const AdminRideListQuerySchema = z.object({
  status: RideStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type AdminRideListQuery = z.infer<typeof AdminRideListQuerySchema>;

export const AdminRideListResponseSchema = z.object({
  rides: z.array(RideSchema),
  limit: z.number().int(),
  offset: z.number().int(),
});
export type AdminRideListResponse = z.infer<typeof AdminRideListResponseSchema>;

export const AdminStatsResponseSchema = z.object({
  rideStatusCounts: z.object({
    requested: z.number().int().nonnegative(),
    accepted: z.number().int().nonnegative(),
    completed: z.number().int().nonnegative(),
    cancelled: z.number().int().nonnegative(),
    expired: z.number().int().nonnegative(),
  }),
});
export type AdminStatsResponse = z.infer<typeof AdminStatsResponseSchema>;
