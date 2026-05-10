import { sqliteTable, integer, text, real, uniqueIndex } from "drizzle-orm/sqlite-core";

// --- Users Table ---
// Minimal global row for username cache (private bot — no Top.gg / vote / premium columns)
export const users = sqliteTable("users", {
    id: text("id").primaryKey(),
    username: text("username").default(""),
});

// --- Channels Table ---
// Per-channel spawn configuration
export const channels = sqliteTable("channels", {
    id: text("id").primaryKey(), // channel_id
    guildId: text("guild_id"), // Not in legacy primary key but useful
    
    // Spawning State
    cat: text("cat").default("0"), // Message ID of the spawned cat (0 if none)
    spawnTimesMin: integer("spawn_times_min").default(60),
    spawnTimesMax: integer("spawn_times_max").default(600),
    lastCatches: integer("lastcatches").default(0), // Timestamp
    yetToSpawn: integer("yet_to_spawn").default(0), // Timestamp
    forceSpawned: integer("forcespawned", { mode: "boolean" }).default(false),
    catType: text("cattype").default(""),
    
    // Messages
    appear: text("appear").default(""),
    cought: text("cought").default(""),
    webhook: text("webhook").default(""),
    
    // Rain Event
    catRains: integer("cat_rains").default(0),
    rainShouldEnd: integer("rain_should_end").default(0),

    // Last catch snapshot (for /kojima last), unix seconds in lastCatches
    lastCatcherId: text("last_catcher_id").default(""),
    lastCatcherName: text("last_catcher_name").default(""),
    lastCatchRarity: text("last_catch_rarity").default(""),
});

// --- Profiles Table ---
/** Per-server stats only for this bot (no Catnip / Battlepass / legacy Cat Bot columns). */
export const profiles = sqliteTable(
    "profiles",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        userId: text("user_id").notNull(),
        guildId: text("guild_id").notNull(),

        totalCatches: integer("total_catches").default(0),
        totalCatchTime: integer("total_catch_time").default(0),
        time: real("time").default(99999999999999),
        timeSlow: real("timeslow").default(0),
        funny: integer("funny").default(0),

        countFine: integer("cat_Fine").default(0),
        countNice: integer("cat_Nice").default(0),
        countGood: integer("cat_Good").default(0),
        countRare: integer("cat_Rare").default(0),
        countWild: integer("cat_Wild").default(0),
        countBaby: integer("cat_Baby").default(0),
        countEpic: integer("cat_Epic").default(0),
        countSus: integer("cat_Sus").default(0),
        countBrave: integer("cat_Brave").default(0),
        countRickroll: integer("cat_Rickroll").default(0),
        countReverse: integer("cat_Reverse").default(0),
        countSuperior: integer("cat_Superior").default(0),
        countTrash: integer("cat_Trash").default(0),
        countLegendary: integer("cat_Legendary").default(0),
        countMythic: integer("cat_Mythic").default(0),
        count8bit: integer("cat_8bit").default(0),
        countCorrupt: integer("cat_Corrupt").default(0),
        countProfessor: integer("cat_Professor").default(0),
        countDivine: integer("cat_Divine").default(0),
        countReal: integer("cat_Real").default(0),
        countUltimate: integer("cat_Ultimate").default(0),
        countEgirl: integer("cat_eGirl").default(0),

        gambles: integer("gambles").default(0),
        slotSpins: integer("slot_spins").default(0),
        slotWins: integer("slot_wins").default(0),
        slotBigWins: integer("slot_big_wins").default(0),
        rouletteBalance: integer("roulette_balance").default(100),
        rouletteWins: integer("roulette_wins").default(0),
        rouletteSpins: integer("roulette_spins").default(0),
        flipPlays: integer("flip_plays").default(0),

        catsGifted: integer("cats_gifted").default(0),
        catGiftsRecieved: integer("cat_gifts_recieved").default(0),
    },
    (t) => ({
        profilesUserGuild: uniqueIndex("profiles_user_guild").on(t.userId, t.guildId),
    }),
);

// --- Achievements (unlock keys reference src/lib/achievements.ts) ---
export const achievementUnlocks = sqliteTable(
    "achievement_unlocks",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        userId: text("user_id").notNull(),
        guildId: text("guild_id").notNull(),
        key: text("key").notNull(),
        unlockedAt: integer("unlocked_at").notNull(),
    },
    (t) => ({
        achUserGuildKey: uniqueIndex("achievement_user_guild_key").on(t.userId, t.guildId, t.key),
    }),
);

