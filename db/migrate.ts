import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.log("No DATABASE_URL configured. Skipping database migration.");
    return;
  }

  console.log("Running migrations...");
  const sql = postgres(connectionString, { max: 1 });
  const db = drizzle(sql);

  try {
    await migrate(db, { migrationsFolder: "drizzle" });
    console.log("Migrations applied successfully.");
  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    await sql.end();
  }
}

if (process.argv[1]?.includes("migrate.ts")) {
  runMigrations();
}

export { runMigrations };
