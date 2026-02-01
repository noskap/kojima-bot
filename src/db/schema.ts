import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

// Core User Profile (Global stats)
export const users = sqliteTable("users", {
    id: text("id").primaryKey(), // Discord User ID
    username: text("username"),
    totalCatches: integer("total_catches").default(0),
    // Re-skinning: Use a generic "custom_name" if needed, but "username" is fine.
});

// Per-Server Profiles (Since it's single server, this might be redundant but keeping for structure)
// Actually, user said "single server", so we can merge User and Profile essentially, but keeping separation is cleaner for potential future expansion.
export const profiles = sqliteTable("profiles", {
    id: integer("id", { mode: 'number' }).primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull(),
    guildId: text("guild_id").notNull(),

    // Catches (Counters for each rarity)
    // We will use a JSON column for dynamic "Thing" types instead of hardcoded columns if we want true flexibility,
    // BUT proper columns are easier to query. 
    // Given "re-skinning", the *names* change but the *mechanics* (rarity) likely stay the same.
    // So we keep "common", "rare", etc.

    countFine: integer("count_fine").default(0),
    countNice: integer("count_nice").default(0),
    countGood: integer("count_good").default(0),
    countRare: integer("count_rare").default(0),
    countWild: integer("count_wild").default(0),
    countBaby: integer("count_baby").default(0),
    countEpic: integer("count_epic").default(0),
    countSus: integer("count_sus").default(0),
    countBrave: integer("count_brave").default(0),
    countRickroll: integer("count_rickroll").default(0),
    countReverse: integer("count_reverse").default(0),
    countSuperior: integer("count_superior").default(0),
    countTrash: integer("count_trash").default(0),
    countLegendary: integer("count_legendary").default(0),
    countMythic: integer("count_mythic").default(0),
    count8bit: integer("count_8bit").default(0),
    countCorrupt: integer("count_corrupt").default(0),
    countProfessor: integer("count_professor").default(0),
    countDivine: integer("count_divine").default(0),
    countReal: integer("count_real").default(0),
    countUltimate: integer("count_ultimate").default(0),
    countEgirl: integer("count_egirl").default(0),

    // Feature: Catching cooldown/state
    lastCatchTime: integer("last_catch_time").default(0), // Timestamp
});

// Channel Configuration (Spawn settings)
export const channels = sqliteTable("channels", {
    id: text("id").primaryKey(), // Channel ID
    guildId: text("guild_id"),
    spawnEnabled: integer("spawn_enabled", { mode: 'boolean' }).default(true),
    // Next spawn timestamp
    nextSpawnTime: integer("next_spawn_time").default(0),
});
