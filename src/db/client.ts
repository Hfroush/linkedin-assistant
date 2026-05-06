import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function getDatabaseUrl(): string {
  const databaseUrl = process.env["DATABASE_URL"];

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL environment variable is not set. " +
        "Add your Neon connection string to .env.local."
    );
  }

  return databaseUrl;
}

function createDb() {
  const sql = neon(getDatabaseUrl());
  return drizzle(sql, { schema });
}

type DbClient = ReturnType<typeof createDb>;

let dbInstance: DbClient | null = null;

function getDb(): DbClient {
  if (dbInstance) return dbInstance;
  dbInstance = createDb();
  return dbInstance;
}

export const db = new Proxy({} as DbClient, {
  get(_target, property, receiver) {
    return Reflect.get(getDb(), property, receiver);
  },
});
