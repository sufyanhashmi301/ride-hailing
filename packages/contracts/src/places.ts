import { z } from "zod";
import { IdSchema } from "./common.js";

export const PlaceSchema = z.object({
  id: IdSchema,
  name: z.string(),
  lat: z.number(),
  lng: z.number(),
});
export type Place = z.infer<typeof PlaceSchema>;

export const PlacesQuerySchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
});
export type PlacesQuery = z.infer<typeof PlacesQuerySchema>;

export const PlacesResponseSchema = z.object({
  places: z.array(PlaceSchema),
});
export type PlacesResponse = z.infer<typeof PlacesResponseSchema>;
