import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { CONFIG } from "../config";
import * as schema from "./schema";

const sqlite = new Database(CONFIG.DB_FILE);
export const db = drizzle(sqlite, { schema });

// Helper to initialize DB (if needed manually, though drizzle-kit usually handles migrations)
export function initDB() {
    console.log(`Database initialized at ${CONFIG.DB_FILE}`);
}
