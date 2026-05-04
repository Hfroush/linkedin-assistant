import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const dbUrl = process.env["TURSO_DATABASE_URL"];
const dbToken = process.env["TURSO_AUTH_TOKEN"];

if (!dbUrl) {
  throw new Error(
    "TURSO_DATABASE_URL environment variable is not set. " +
      "Copy .env.local.example to .env.local and fill in your Turso database URL."
  );
}

if (!dbToken) {
  throw new Error(
    "TURSO_AUTH_TOKEN environment variable is not set. " +
      "Copy .env.local.example to .env.local and fill in your Turso auth token."
  );
}

const client = createClient({
  url: dbUrl,
  authToken: dbToken,
});

export const db = drizzle(client, { schema });
