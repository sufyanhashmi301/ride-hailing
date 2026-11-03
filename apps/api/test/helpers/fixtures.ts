import { randomUUID } from "node:crypto";
import { hash } from "@node-rs/argon2";
import { cities, type Db, drivers, ridePackages, users } from "@ride/db";

export const TEST_PASSWORD = "Passw0rd!";

let cachedPasswordHash: string | undefined;

async function testPasswordHash(): Promise<string> {
  if (!cachedPasswordHash) {
    cachedPasswordHash = await hash(TEST_PASSWORD);
  }
  return cachedPasswordHash;
}

export async function seedCity(
  db: Db,
  overrides: Partial<typeof cities.$inferInsert> = {},
): Promise<typeof cities.$inferSelect> {
  const [city] = await db
    .insert(cities)
    .values({
      name: "Lahore",
      slug: `lahore-${randomUUID()}`,
      minLat: 31.3,
      maxLat: 31.65,
      minLng: 74.15,
      maxLng: 74.5,
      ...overrides,
    })
    .returning();
  if (!city) throw new Error("failed to seed city");
  return city;
}

export async function seedPackages(db: Db, cityId: string): Promise<void> {
  await db.insert(ridePackages).values([
    { cityId, category: "economy", baseFarePkr: 100, perKmPkr: 40, perMinPkr: 5, minFarePkr: 150 },
    { cityId, category: "comfort", baseFarePkr: 150, perKmPkr: 60, perMinPkr: 8, minFarePkr: 220 },
  ]);
}

export async function seedUser(
  db: Db,
  role: "rider" | "driver" | "admin",
  overrides: Partial<typeof users.$inferInsert> = {},
): Promise<typeof users.$inferSelect> {
  const [user] = await db
    .insert(users)
    .values({
      name: `${role}-${randomUUID().slice(0, 8)}`,
      email: `${role}-${randomUUID()}@test.local`,
      phone: "+923000000000",
      role,
      passwordHash: await testPasswordHash(),
      ...overrides,
    })
    .returning();
  if (!user) throw new Error("failed to seed user");
  return user;
}

export async function seedDriver(
  db: Db,
  cityId: string,
  overrides: Partial<typeof drivers.$inferInsert> = {},
): Promise<{ user: typeof users.$inferSelect; driver: typeof drivers.$inferSelect }> {
  const user = await seedUser(db, "driver");
  const [driver] = await db
    .insert(drivers)
    .values({
      userId: user.id,
      cityId,
      vehicleCategory: "economy",
      vehiclePlate: `TEST-${randomUUID().slice(0, 8)}`,
      isOnline: true,
      ...overrides,
    })
    .returning();
  if (!driver) throw new Error("failed to seed driver");
  return { user, driver };
}
