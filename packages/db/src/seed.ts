import { hash } from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { cities, drivers, places, ridePackages, users } from "./schema/index.js";

try {
  process.loadEnvFile();
} catch {
  // no .env file present; rely on env vars set directly (CI, Docker)
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const SEED_PASSWORD = "Passw0rd!";

const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle(pool);

async function upsertUser(input: {
  name: string;
  email: string;
  phone: string;
  role: "rider" | "driver" | "admin";
  passwordHash: string;
}) {
  const [row] = await db
    .insert(users)
    .values(input)
    .onConflictDoUpdate({
      target: users.email,
      set: { name: input.name, phone: input.phone, role: input.role },
    })
    .returning();
  if (!row) {
    throw new Error(`Failed to upsert user ${input.email}`);
  }
  return row;
}

async function main() {
  const passwordHash = await hash(SEED_PASSWORD);

  const [lahore] = await db
    .insert(cities)
    .values({
      name: "Lahore",
      slug: "lahore",
      minLat: 31.3,
      maxLat: 31.65,
      minLng: 74.15,
      maxLng: 74.5,
    })
    .onConflictDoUpdate({
      target: cities.slug,
      set: { minLat: 31.3, maxLat: 31.65, minLng: 74.15, maxLng: 74.5, isActive: true },
    })
    .returning();
  if (!lahore) {
    throw new Error("Failed to upsert Lahore city");
  }

  const packageSeeds = [
    { category: "economy" as const, baseFarePkr: 100, perKmPkr: 40, perMinPkr: 5, minFarePkr: 150 },
    { category: "comfort" as const, baseFarePkr: 150, perKmPkr: 60, perMinPkr: 8, minFarePkr: 220 },
  ];

  for (const pkg of packageSeeds) {
    await db
      .insert(ridePackages)
      .values({ cityId: lahore.id, ...pkg })
      .onConflictDoUpdate({
        target: [ridePackages.cityId, ridePackages.category],
        set: {
          baseFarePkr: pkg.baseFarePkr,
          perKmPkr: pkg.perKmPkr,
          perMinPkr: pkg.perMinPkr,
          minFarePkr: pkg.minFarePkr,
        },
      });
  }

  await upsertUser({
    name: "Admin",
    email: "admin@ride.local",
    phone: "+923000000000",
    role: "admin",
    passwordHash,
  });

  for (let i = 1; i <= 3; i++) {
    await upsertUser({
      name: `Rider ${i}`,
      email: `rider${i}@ride.local`,
      phone: `+92300000100${i}`,
      role: "rider",
      passwordHash,
    });
  }

  const driverPlates = [
    "LEA-2001",
    "LEB-2002",
    "LEC-2003",
    "LED-2004",
    "LEE-2005",
    "LEF-2006",
    "LEG-2007",
    "LEH-2008",
    "LEI-2009",
    "LEJ-2010",
  ];

  for (const [index, plate] of driverPlates.entries()) {
    const driverNumber = index + 1;
    const driverUser = await upsertUser({
      name: `Driver ${driverNumber}`,
      email: `driver${driverNumber}@ride.local`,
      phone: `+92300000200${driverNumber}`,
      role: "driver",
      passwordHash,
    });

    await db
      .insert(drivers)
      .values({
        userId: driverUser.id,
        cityId: lahore.id,
        vehicleCategory: driverNumber % 2 === 0 ? "comfort" : "economy",
        vehiclePlate: plate,
        isOnline: false,
      })
      .onConflictDoUpdate({
        target: drivers.userId,
        set: {
          cityId: lahore.id,
          vehicleCategory: driverNumber % 2 === 0 ? "comfort" : "economy",
          vehiclePlate: plate,
        },
      });
  }

  const lahorePlaces: Array<{ name: string; lat: number; lng: number }> = [
    { name: "Liberty Market", lat: 31.5125, lng: 74.3458 },
    { name: "Packages Mall", lat: 31.4789, lng: 74.363 },
    { name: "Lahore Fort", lat: 31.5881, lng: 74.3142 },
    { name: "Minar-e-Pakistan", lat: 31.5925, lng: 74.3088 },
    { name: "Gaddafi Stadium", lat: 31.5139, lng: 74.3406 },
    { name: "Allama Iqbal International Airport", lat: 31.5216, lng: 74.4036 },
    { name: "Anarkali Bazaar", lat: 31.5675, lng: 74.31 },
    { name: "DHA Phase 6", lat: 31.4697, lng: 74.4115 },
    { name: "Model Town Park", lat: 31.4833, lng: 74.3283 },
    { name: "Fortress Stadium", lat: 31.5265, lng: 74.361 },
    { name: "Emporium Mall", lat: 31.483, lng: 74.3568 },
    { name: "Lahore Zoo", lat: 31.5563, lng: 74.3273 },
    { name: "Shalimar Gardens", lat: 31.5908, lng: 74.3794 },
    { name: "Jilani Park", lat: 31.5375, lng: 74.3453 },
    { name: "Lahore Railway Station", lat: 31.5804, lng: 74.33 },
  ];

  const existingPlaces = await db
    .select({ name: places.name })
    .from(places)
    .where(eq(places.cityId, lahore.id));
  const existingNames = new Set(existingPlaces.map((p) => p.name));
  const placesToInsert = lahorePlaces
    .filter((place) => !existingNames.has(place.name))
    .map((place) => ({ ...place, cityId: lahore.id }));

  if (placesToInsert.length > 0) {
    await db.insert(places).values(placesToInsert);
  }

  console.log("Seed complete");
}

await main();
await pool.end();
