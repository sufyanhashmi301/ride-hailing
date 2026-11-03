import { type Db, places } from "@ride/db";
import { ilike } from "drizzle-orm";

export async function searchPlaces(db: Db, query: string | undefined) {
  if (!query) {
    return db.select().from(places).limit(20);
  }
  return db
    .select()
    .from(places)
    .where(ilike(places.name, `%${query}%`))
    .limit(20);
}
