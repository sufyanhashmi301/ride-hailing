import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { buildApp } from "./app.js";
import { loadEnv } from "./config/env.js";

// server.ts runs from apps/api/{src,dist}, three levels below the monorepo root where .env lives.
config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });

const env = loadEnv();
const app = await buildApp(env);

try {
  await app.listen({ host: "0.0.0.0", port: env.PORT });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
