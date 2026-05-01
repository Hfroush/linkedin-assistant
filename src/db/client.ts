import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

if (!process.env.TURSO_DATABASE_URL) {
  throw new Error(
    "TURSO_DATABASE_URL environment variable is not set. " +
      "Copy .env.local.example to .env.local and fill in your Turso database URL."
  );
}

if (!process.env.TURSO_AUTH_TOKEN) {
  throw new Error(
    "TURSO_AUTH_TOKEN environment variable is not set. " +
      "Copy .env.local.example to .env.local and fill in your Turso auth token."
  );
}

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
