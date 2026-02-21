import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { config } from "../lib/config";
import * as schema from "./schema";

const client = postgres(config.db.url);
export const db = drizzle(client, { schema });

// Create readonly database connection for AI Star Task
const readOnlyUrl = config.db.url.replace(
  /postgres:\/\/[^:]+:[^@]+@/,
  "postgres://analytics_readonly:readonly_password@",
);

const readOnlyClient = postgres(readOnlyUrl);
export const readOnlyDb = drizzle(readOnlyClient, { schema });

// Ensure the readonly user exists on startup
const setupReadonlyRole = async () => {
  try {
    await db.execute(
      sql.raw(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'analytics_readonly') THEN
          CREATE ROLE analytics_readonly WITH LOGIN PASSWORD 'readonly_password';
          GRANT USAGE ON SCHEMA public TO analytics_readonly;
          GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_readonly;
          ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO analytics_readonly;
        END IF;
      END
      $$;
    `),
    );
    console.log("🛡️ Read-Only database role for AI is ready");
  } catch (err) {
    console.error("Failed to setup readonly role:", err);
  }
};

// Export a runner that ensures DB is ready
export const initDb = async () => {
  try {
    console.log("🔄 Running migrations...");
    await migrate(db, { migrationsFolder: "./src/db/migrations" });
    console.log("✅ Migrations completed");
    await setupReadonlyRole();
  } catch (err) {
    console.error("❌ Database initialization failed:", err);
  }
};
