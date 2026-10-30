import "server-only";
import { neon } from "@neondatabase/serverless";

export function database() {
  const connection = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;
  if (!connection) throw new Error("database_not_configured");
  return neon(connection);
}
