import { sqliteTable, integer, text, real, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// --- Users Table ---
// Global user data (cross-server)
export const users = sqliteTable("users", {
    id: text("id").primaryKey(), // user_id
    username: text("username").default(""),
    
    // Voting stats
    voteTimeTopgg: integer("vote_time_topgg").default(0),
    totalVotes: integer("total_votes").default(0),
    voteStreak: integer("vote_streak").default(0),
    maxVoteStreak: integer("max_vote_streak").default(0),
    streakFreezes: integer("streak_freezes").default(0),
    reminderVote: integer("reminder_vote").default(0),
    
    // Profile Customization
    custom: text("custom").default(""),
    emoji: text("emoji").default(""),
    color: text("color").default(""),
    image: text("image").default(""),
    
    // Status / Settings
    premium: integer("premium", { mode: "boolean" }).default(false),
    claimedFreeRain: integer("claimed_free_rain", { mode: "boolean" }).default(false),
    rainMinutes: integer("rain_minutes").default(0),
    rainMinutesBought: integer("rain_minutes_bought").default(0),
    newsState: text("news_state").default(""),
    customNum: integer("custom_num").default(1),
    
    // Blessings
    catsBlessed: integer("cats_blessed").default(0),
    blessingsEnabled: integer("blessings_enabled", { mode: "boolean" }).default(false),
    blessingsAnonymous: integer("blessings_anonymous", { mode: "boolean" }).default(false),
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
// Per-server user stats and inventory
export const profiles = sqliteTable("profiles", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull(),
    guildId: text("guild_id").notNull(),
    
    // Catching Stats
    totalCatches: integer("total_catches").default(0),
    totalCatchTime: integer("total_catch_time").default(0), // In milliseconds/seconds accumulator?
    time: real("time").default(99999999999999), // Best time
    timeSlow: real("timeslow").default(0),      // Slowest time
    timeout: integer("timeout").default(0),     // Timeout until
    
    // Cat Counts (Rarities)
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
    
    // Economy / Items
    catnipActive: integer("catnip_active").default(0),
    catnipLevel: integer("catnip_level").default(0),
    catnipTotalCats: integer("catnip_total_cats").default(0),
    catnipPrice: text("catnip_price").default("Fine"),
    catnipAmount: integer("catnip_amount").default(0),
    catnipActivations: integer("catnip_activations").default(0),
    catnipBought: integer("catnip_bought").default(0),
    highestCatnipLevel: integer("highest_catnip_level").default(0),
    
    // Battlepass
    battlepass: integer("battlepass").default(0),
    progress: integer("progress").default(0),
    season: integer("season").default(0),
    bpHistory: text("bp_history").default(""),
    questsCompleted: integer("quests_completed").default(0),
    
    // Quests & Reminders
    catchQuest: text("catch_quest").default(""),
    catchProgress: integer("catch_progress").default(0),
    catchCooldown: integer("catch_cooldown").default(1),
    catchReward: integer("catch_reward").default(0),
    miscQuest: text("misc_quest").default(""),
    miscProgress: integer("misc_progress").default(0),
    miscCooldown: integer("misc_cooldown").default(1),
    miscReward: integer("misc_reward").default(0),
    reminderCatch: integer("reminder_catch").default(0),
    reminderMisc: integer("reminder_misc").default(0),
    remindersEnabled: integer("reminders_enabled", { mode: "boolean" }).default(false),
    remindersSet: integer("reminders_set").default(0),

    // Achievements (Booleans)
    first: integer("first", { mode: "boolean" }).default(false),
    second: integer("second", { mode: "boolean" }).default(false),
    third: integer("third", { mode: "boolean" }).default(false),
    fourth: integer("fourth", { mode: "boolean" }).default(false),
    donator: integer("donator", { mode: "boolean" }).default(false),
    antiDonator: integer("anti_donator", { mode: "boolean" }).default(false),
    extrovert: integer("extrovert", { mode: "boolean" }).default(false),
    fastCatcher: integer("fast_catcher", { mode: "boolean" }).default(false),
    slowCatcher: integer("slow_catcher", { mode: "boolean" }).default(false),
    collecter: integer("collecter", { mode: "boolean" }).default(false),
    trolled: integer("trolled", { mode: "boolean" }).default(false),
    achiever: integer("achiever", { mode: "boolean" }).default(false),
    leader: integer("leader", { mode: "boolean" }).default(false),
    darkMarket: integer("dark_market", { mode: "boolean" }).default(false), // Achievement
    darkMarketActive: integer("dark_market_active", { mode: "boolean" }).default(false), // State
    bountyNovice: integer("bounty_novice", { mode: "boolean" }).default(false),
    bountyHunter: integer("bounty_hunter", { mode: "boolean" }).default(false),
    bountyLord: integer("bounty_lord", { mode: "boolean" }).default(false),
    randomizer: integer("randomizer", { mode: "boolean" }).default(false),
    pineapple: integer("pineapple", { mode: "boolean" }).default(false),
    daily: integer("daily", { mode: "boolean" }).default(false),
    dm: integer("dm", { mode: "boolean" }).default(false),
    whoPing: integer("who_ping", { mode: "boolean" }).default(false),
    introvert: integer("introvert", { mode: "boolean" }).default(false),
    pleasedonotthecat: integer("pleasedonotthecat", { mode: "boolean" }).default(false),
    pleasedothecat: integer("pleasedothecat", { mode: "boolean" }).default(false),
    worship: integer("worship", { mode: "boolean" }).default(false),
    testAch: integer("test_ach", { mode: "boolean" }).default(false),
    k4: integer("4k", { mode: "boolean" }).default(false),
    curious: integer("curious", { mode: "boolean" }).default(false),
    car: integer("car", { mode: "boolean" }).default(false),
    questionMark: integer("???", { mode: "boolean" }).default(false),
    notQuite: integer("not_quite", { mode: "boolean" }).default(false),
    websiteUser: integer("website_user", { mode: "boolean" }).default(false),
    coffee: integer("coffee", { mode: "boolean" }).default(false),
    sussy: integer("sussy", { mode: "boolean" }).default(false),
    egril: integer("egril", { mode: "boolean" }).default(false),
    bwomp: integer("bwomp", { mode: "boolean" }).default(false),
    silly: integer("silly", { mode: "boolean" }).default(false),
    nice: integer("nice", { mode: "boolean" }).default(false),
    clickHere: integer("click_here", { mode: "boolean" }).default(false),
    patientReader: integer("patient_reader", { mode: "boolean" }).default(false),
    nerd: integer("nerd", { mode: "boolean" }).default(false),
    loudCat: integer("loud_cat", { mode: "boolean" }).default(false),
    reverse: integer("reverse", { mode: "boolean" }).default(false),
    desperate: integer("desperate", { mode: "boolean" }).default(false),
    lonely: integer("lonely", { mode: "boolean" }).default(false),
    k8: integer("8k", { mode: "boolean" }).default(false),
    scammed: integer("scammed", { mode: "boolean" }).default(false),
    absolutelyNothing: integer("absolutely_nothing", { mode: "boolean" }).default(false),
    sacrifice: integer("sacrifice", { mode: "boolean" }).default(false),
    notLikeThat: integer("not_like_that", { mode: "boolean" }).default(false),
    gamblingOne: integer("gambling_one", { mode: "boolean" }).default(false),
    broke: integer("broke", { mode: "boolean" }).default(false),
    secret: integer("secret", { mode: "boolean" }).default(false),
    goodCitizen: integer("good_citizen", { mode: "boolean" }).default(false),
    perfectlyBalanced: integer("perfectly_balanced", { mode: "boolean" }).default(false),
    factEnjoyer: integer("fact_enjoyer", { mode: "boolean" }).default(false),
    morseCat: integer("morse_cat", { mode: "boolean" }).default(false),
    lucky: integer("lucky", { mode: "boolean" }).default(false),
    gamblingTwo: integer("gambling_two", { mode: "boolean" }).default(false),
    nerdBattle: integer("nerd_battle", { mode: "boolean" }).default(false),
    itsNotWorking: integer("its_not_working", { mode: "boolean" }).default(false),
    rich: integer("rich", { mode: "boolean" }).default(false),
    pie: integer("pie", { mode: "boolean" }).default(false),
    perfection: integer("perfection", { mode: "boolean" }).default(false),
    allTheSame: integer("all_the_same", { mode: "boolean" }).default(false),
    paradoxicalGambler: integer("paradoxical_gambler", { mode: "boolean" }).default(false),
    darkestMarket: integer("darkest_market", { mode: "boolean" }).default(false),
    capitalism: integer("capitalism", { mode: "boolean" }).default(false),
    profit: integer("profit", { mode: "boolean" }).default(false),
    catn: integer("catn", { mode: "boolean" }).default(false),
    couponUser: integer("coupon_user", { mode: "boolean" }).default(false),
    dataminer: integer("dataminer", { mode: "boolean" }).default(false),
    blackhole: integer("blackhole", { mode: "boolean" }).default(false),
    catRain: integer("cat_rain", { mode: "boolean" }).default(false),
    mafiaWin: integer("mafia_win", { mode: "boolean" }).default(false),
    thanksforplaying: integer("thanksforplaying", { mode: "boolean" }).default(false),
    prismsUnlocked: integer("prisms_unlocked", { mode: "boolean" }).default(false),
    boosted: integer("boosted", { mode: "boolean" }).default(false),
    news: integer("news", { mode: "boolean" }).default(false),
    reminder: integer("reminder", { mode: "boolean" }).default(false),
    prismAch: integer("prism", { mode: "boolean" }).default(false),
    balling: integer("balling", { mode: "boolean" }).default(false),
    slots: integer("slots", { mode: "boolean" }).default(false),
    winSlots: integer("win_slots", { mode: "boolean" }).default(false),
    bigWinSlots: integer("big_win_slots", { mode: "boolean" }).default(false),
    finaleSeen: integer("finale_seen", { mode: "boolean" }).default(false),
    multilingual: integer("multilingual", { mode: "boolean" }).default(false),
    debt: integer("debt", { mode: "boolean" }).default(false),
    debtSeen: integer("debt_seen", { mode: "boolean" }).default(false),
    newUser: integer("new_user", { mode: "boolean" }).default(true),
    define: integer("define", { mode: "boolean" }).default(false),
    cookieclicker: integer("cookieclicker", { mode: "boolean" }).default(false),
    cookiesclicked: integer("cookiesclicked", { mode: "boolean" }).default(false),
    pig50: integer("pig50", { mode: "boolean" }).default(false),
    pig100: integer("pig100", { mode: "boolean" }).default(false),
    sphereAch: integer("sphere_ach", { mode: "boolean" }).default(false),
    rouletteWinner: integer("roulette_winner", { mode: "boolean" }).default(false),
    rouletteProdigy: integer("roulette_prodigy", { mode: "boolean" }).default(false),
    failedGambler: integer("failed_gambler", { mode: "boolean" }).default(false),
    certifiedYapper: integer("certified_yapper", { mode: "boolean" }).default(false),
    pingReply: integer("ping_reply", { mode: "boolean" }).default(false),

    // Gambling Stats
    gambles: integer("gambles").default(0),
    slotSpins: integer("slot_spins").default(0),
    slotWins: integer("slot_wins").default(0),
    slotBigWins: integer("slot_big_wins").default(0),
    rouletteBalance: integer("roulette_balance").default(100),
    rouletteWins: integer("roulette_wins").default(0),
    rouletteSpins: integer("roulette_spins").default(0),
    flipPlays: integer("flip_plays").default(0),
    
    // Packs Inventory
    packWooden: integer("pack_wooden").default(0),
    packStone: integer("pack_stone").default(0),
    packBronze: integer("pack_bronze").default(0),
    packSilver: integer("pack_silver").default(0),
    packGold: integer("pack_gold").default(0),
    packPlatinum: integer("pack_platinum").default(0),
    packDiamond: integer("pack_diamond").default(0),
    packCelestial: integer("pack_celestial").default(0),
    packsOpened: integer("packs_opened").default(0),
    packUpgrades: integer("pack_upgrades").default(0),
    
    // Stats & Misc
    funny: integer("funny").default(0),
    facts: integer("facts").default(0),
    catsGifted: integer("cats_gifted").default(0),
    catGiftsRecieved: integer("cat_gifts_recieved").default(0),
    tradesCompleted: integer("trades_completed").default(0),
    catsTraded: integer("cats_traded").default(0),
    rainParticipations: integer("rain_participations").default(0),
    rainMinutesStarted: integer("rain_minutes_started").default(0),
    perfectionCount: integer("perfection_count").default(0),
    boostedCatches: integer("boosted_catches").default(0),
    
    // Tic Tac Toe
    tttPlayed: integer("ttt_played").default(0),
    tttWon: integer("ttt_won").default(0),
    tttDraws: integer("ttt_draws").default(0),
    tttWin: integer("ttt_win", { mode: "boolean" }).default(false),

    // Other
    hibernation: integer("hibernation", { mode: "boolean" }).default(false),
    cookies: integer("cookies").default(0),
    bestPigScore: integer("best_pig_score").default(0),
    sphereEasterEgg: integer("sphere_easter_egg").default(0),
    cutscene: integer("cutscene").default(0),
}, (t) => ({
    profilesUserGuild: uniqueIndex("profiles_user_guild").on(t.userId, t.guildId),
}));

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

// --- Prisms Table ---
// Boost items created by users
export const prisms = sqliteTable("prisms", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull(),
    guildId: text("guild_id").notNull(),
    time: integer("time").notNull(), // Creation timestamp
    creator: text("creator").notNull(), // Creator user ID (redundant with userId? check logic)
    name: text("name").notNull(),
    catchesBoosted: integer("catches_boosted").default(0),
});

// --- Reminders Table ---
export const reminders = sqliteTable("reminders", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull(),
    time: integer("time").notNull(),
    text: text("text").notNull(),
});
