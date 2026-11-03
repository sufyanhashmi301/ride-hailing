import { PlacesQuerySchema, PlacesResponseSchema } from "@ride/contracts";
import type { Db } from "@ride/db";
import { requireAuth } from "../../plugins/auth.js";
import type { App } from "../../types.js";
import { searchPlaces } from "./places.service.js";

export function registerPlacesRoutes(app: App, db: Db) {
  app.get("/api/v1/places", {
    preHandler: requireAuth,
    schema: {
      querystring: PlacesQuerySchema,
      response: { 200: PlacesResponseSchema },
    },
    handler: async (request) => {
      const results = await searchPlaces(db, request.query.q);
      return { places: results };
    },
  });
}
