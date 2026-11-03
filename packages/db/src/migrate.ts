import { migrateDatabase } from "./migrate-runtime.js";

try {
  process.loadEnvFile();
} catch {
  // no .env file present; rely on env vars set directly (CI, Docker)
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

await migrateDatabase(databaseUrl);
console.log("Migrations applied");
