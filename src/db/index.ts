import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { CONFIG } from "../config";
import * as schema from "./schema";
import { ensureSqliteSchema } from "./migrate-sqlite";

const sqlite = new Database(CONFIG.DB_FILE);
ensureSqliteSchema(sqlite);
export const db = drizzle(sqlite, { schema });

export function initDB() {
    console.log(`Database initialized at ${CONFIG.DB_FILE}`);
}
