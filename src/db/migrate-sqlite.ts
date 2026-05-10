import type { Database } from "bun:sqlite";

function tableColumns(db: Database, table: string): Set<string> {
    const rows = db.query(`PRAGMA table_info("${table}")`).all() as { name: string }[];
    return new Set(rows.map((r) => r.name));
}

function tableExists(db: Database, name: string): boolean {
    const row = db.query(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(name) as
        | { name: string }
        | undefined;
    return Boolean(row);
}

function addColumn(db: Database, table: string, name: string, ddl: string): void {
    const cols = tableColumns(db, table);
    if (cols.has(name)) return;
    db.exec(`ALTER TABLE "${table}" ADD COLUMN "${name}" ${ddl}`);
}

/**
 * Additive SQLite fixes when `bot.sqlite` was created from an older schema (missing columns).
 */
export function ensureSqliteSchema(db: Database): void {
    if (tableExists(db, "channels")) {
        addColumn(db, "channels", "cat", `text DEFAULT '0'`);
        addColumn(db, "channels", "spawn_times_min", "integer DEFAULT 60");
        addColumn(db, "channels", "spawn_times_max", "integer DEFAULT 600");
        addColumn(db, "channels", "lastcatches", "integer DEFAULT 0");
        addColumn(db, "channels", "yet_to_spawn", "integer DEFAULT 0");
        addColumn(db, "channels", "forcespawned", "integer DEFAULT 0");
        addColumn(db, "channels", "cattype", `text DEFAULT ''`);
        addColumn(db, "channels", "appear", `text DEFAULT ''`);
        addColumn(db, "channels", "cought", `text DEFAULT ''`);
        addColumn(db, "channels", "webhook", `text DEFAULT ''`);
        addColumn(db, "channels", "cat_rains", "integer DEFAULT 0");
        addColumn(db, "channels", "rain_should_end", "integer DEFAULT 0");
        addColumn(db, "channels", "last_catcher_id", `text DEFAULT ''`);
        addColumn(db, "channels", "last_catcher_name", `text DEFAULT ''`);
        addColumn(db, "channels", "last_catch_rarity", `text DEFAULT ''`);

        const c = tableColumns(db, "channels");
        if (c.has("next_spawn_time")) {
            db.exec(`UPDATE "channels" SET yet_to_spawn = COALESCE(next_spawn_time, 0) WHERE COALESCE(yet_to_spawn, 0) = 0`);
        }
    }

    if (tableExists(db, "profiles")) {
        const pCols = tableColumns(db, "profiles");
        addColumn(db, "profiles", "flip_plays", "integer DEFAULT 0");

        if (pCols.has("count_fine") && !pCols.has("cat_Fine")) {
            addColumn(db, "profiles", "cat_Fine", "integer DEFAULT 0");
            addColumn(db, "profiles", "cat_Nice", "integer DEFAULT 0");
            addColumn(db, "profiles", "cat_Good", "integer DEFAULT 0");
            addColumn(db, "profiles", "cat_Rare", "integer DEFAULT 0");
            addColumn(db, "profiles", "cat_Wild", "integer DEFAULT 0");
            addColumn(db, "profiles", "cat_Baby", "integer DEFAULT 0");
            addColumn(db, "profiles", "cat_Epic", "integer DEFAULT 0");
            addColumn(db, "profiles", "cat_Sus", "integer DEFAULT 0");
            addColumn(db, "profiles", "cat_Brave", "integer DEFAULT 0");
            addColumn(db, "profiles", "cat_Rickroll", "integer DEFAULT 0");
            addColumn(db, "profiles", "cat_Reverse", "integer DEFAULT 0");
            addColumn(db, "profiles", "cat_Superior", "integer DEFAULT 0");
            addColumn(db, "profiles", "cat_Trash", "integer DEFAULT 0");
            addColumn(db, "profiles", "cat_Legendary", "integer DEFAULT 0");
            addColumn(db, "profiles", "cat_Mythic", "integer DEFAULT 0");
            addColumn(db, "profiles", "cat_8bit", "integer DEFAULT 0");
            addColumn(db, "profiles", "cat_Corrupt", "integer DEFAULT 0");
            addColumn(db, "profiles", "cat_Professor", "integer DEFAULT 0");
            addColumn(db, "profiles", "cat_Divine", "integer DEFAULT 0");
            addColumn(db, "profiles", "cat_Real", "integer DEFAULT 0");
            addColumn(db, "profiles", "cat_Ultimate", "integer DEFAULT 0");
            addColumn(db, "profiles", "cat_eGirl", "integer DEFAULT 0");
            db.exec(`
                UPDATE "profiles" SET
                  cat_Fine = count_fine,
                  cat_Nice = count_nice,
                  cat_Good = count_good,
                  cat_Rare = count_rare,
                  cat_Wild = count_wild,
                  cat_Baby = count_baby,
                  cat_Epic = count_epic,
                  cat_Sus = count_sus,
                  cat_Brave = count_brave,
                  cat_Rickroll = count_rickroll,
                  cat_Reverse = count_reverse,
                  cat_Superior = count_superior,
                  cat_Trash = count_trash,
                  cat_Legendary = count_legendary,
                  cat_Mythic = count_mythic,
                  cat_8bit = count_8bit,
                  cat_Corrupt = count_corrupt,
                  cat_Professor = count_professor,
                  cat_Divine = count_divine,
                  cat_Real = count_real,
                  cat_Ultimate = count_ultimate,
                  cat_eGirl = count_egirl
            `);
        }

        for (const [col, ddl] of [
            ["total_catches", "integer DEFAULT 0"],
            ["total_catch_time", "integer DEFAULT 0"],
            ["funny", "integer DEFAULT 0"],
            ["time", "real DEFAULT 99999999999999"],
            ["timeslow", "real DEFAULT 0"],
            ["roulette_balance", "integer DEFAULT 100"],
            ["gambles", "integer DEFAULT 0"],
            ["slot_spins", "integer DEFAULT 0"],
            ["slot_wins", "integer DEFAULT 0"],
            ["slot_big_wins", "integer DEFAULT 0"],
            ["roulette_wins", "integer DEFAULT 0"],
            ["roulette_spins", "integer DEFAULT 0"],
            ["cats_gifted", "integer DEFAULT 0"],
            ["cat_gifts_recieved", "integer DEFAULT 0"],
        ] as const) {
            addColumn(db, "profiles", col, ddl);
        }
    }

    if (!tableExists(db, "achievement_unlocks")) {
        db.exec(`
            CREATE TABLE IF NOT EXISTS "achievement_unlocks" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "user_id" text NOT NULL,
                "guild_id" text NOT NULL,
                "key" text NOT NULL,
                "unlocked_at" integer NOT NULL
            );
        `);
        db.exec(
            `CREATE UNIQUE INDEX IF NOT EXISTS "achievement_user_guild_key" ON "achievement_unlocks" ("user_id", "guild_id", "key");`,
        );
    }
}
