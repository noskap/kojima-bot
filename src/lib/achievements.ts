import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { achievementUnlocks, profiles } from "../db/schema";
import { isMythicSlot, isShinySlot, isSusSlot } from "./rarities";

export type ProfileRow = typeof profiles.$inferSelect;

export type AchievementInfo = { key: string; title: string; description: string };

/** Catalog of earnable achievements (keys stable for DB). */
export const ACHIEVEMENT_CATALOG: Record<string, Omit<AchievementInfo, "key">> = {
    first_catch: { title: "First Contact", description: "Catch your first wild spawn." },
    speed_demon: { title: "Speed Demon", description: "Catch in under 2 seconds." },
    glacier: { title: "Glacier Hands", description: "Catch something that took over a minute." },
    collector: { title: "Collector", description: "Reach 25 total catches in this server." },
    hoarder: { title: "Hoarder", description: "Reach 100 total catches in this server." },
    mythic_touch: { title: "Mythic-slot", description: "Catch the type mapped to the `countMythic` column (see `PROFILE_COUNT_SLOTS`)." },
    shiny_hunter: { title: "Shiny Hunter", description: "Catch a type mapped to `countLegendary`, `countDivine`, or `countUltimate`." },
    sus_moment: { title: "Sus-slot", description: "Catch the type mapped to the `countSus` column." },
    variety_pack: { title: "Variety Pack", description: "Have at least 8 different rarity types on your sheet." },
    generous: { title: "Generous", description: "Send 5 gifts." },
    popular: { title: "Popular", description: "Receive 5 gifts." },
    gamble_first: { title: "House Rules", description: "Place any casino bet." },
    slots_regular: { title: "One-Armed Fan", description: "Spin the slots once." },
    slots_whale: { title: "Jackpot Energy", description: "Hit a triple diamond on the slots." },
    roulette_first: { title: "Wheel Tourist", description: "Win a roulette spin." },
    flip_addict: { title: "Coin Curious", description: "Play coinflip 10 times." },
    high_roller: { title: "High Roller", description: "Hold at least 5,000 chips at once." },
    stone_broke: { title: "Floor Chips Only", description: "Reach 0 chips after a loss." },
    chip_hoarder: { title: "Chip Hoarder", description: "Hold at least 25,000 chips." },
    completionist: { title: "Achievement Hunter", description: "Unlock 10 different achievements here." },
};

function rarityVarietyCount(p: ProfileRow): number {
    const keys = [
        p.countFine,
        p.countNice,
        p.countGood,
        p.countRare,
        p.countWild,
        p.countBaby,
        p.countEpic,
        p.countSus,
        p.countBrave,
        p.countRickroll,
        p.countReverse,
        p.countSuperior,
        p.countTrash,
        p.countLegendary,
        p.countMythic,
        p.count8bit,
        p.countCorrupt,
        p.countProfessor,
        p.countDivine,
        p.countReal,
        p.countUltimate,
        p.countEgirl,
    ];
    return keys.filter((n) => (n ?? 0) > 0).length;
}

export async function tryUnlockAchievement(
    userId: string,
    guildId: string,
    key: keyof typeof ACHIEVEMENT_CATALOG | string,
): Promise<AchievementInfo | null> {
    const meta = ACHIEVEMENT_CATALOG[key as keyof typeof ACHIEVEMENT_CATALOG];
    if (!meta) return null;

    const exists = await db
        .select({ id: achievementUnlocks.id })
        .from(achievementUnlocks)
        .where(
            and(
                eq(achievementUnlocks.userId, userId),
                eq(achievementUnlocks.guildId, guildId),
                eq(achievementUnlocks.key, key),
            ),
        )
        .get();
    if (exists) return null;

    await db
        .insert(achievementUnlocks)
        .values({
            userId,
            guildId,
            key,
            unlockedAt: Math.floor(Date.now() / 1000),
        })
        .run();

    const info: AchievementInfo = { key, ...meta };
    await maybeUnlockCompletionist(userId, guildId);
    return info;
}

async function maybeUnlockCompletionist(userId: string, guildId: string): Promise<void> {
    const row = await db
        .select({ n: sql<number>`count(*)` })
        .from(achievementUnlocks)
        .where(and(eq(achievementUnlocks.userId, userId), eq(achievementUnlocks.guildId, guildId)))
        .get();
    const n = Number(row?.n ?? 0);
    if (n >= 10) {
        await tryUnlockAchievement(userId, guildId, "completionist");
    }
}

export type CatchAchievementInput = {
    profile: ProfileRow;
    catchSeconds: number;
    rarityDisplay: string;
};

export async function processCatchAchievements(
    userId: string,
    guildId: string,
    input: CatchAchievementInput,
): Promise<AchievementInfo[]> {
    const { profile, catchSeconds, rarityDisplay } = input;
    const unlocked: AchievementInfo[] = [];

    const push = async (key: keyof typeof ACHIEVEMENT_CATALOG) => {
        const u = await tryUnlockAchievement(userId, guildId, key);
        if (u) unlocked.push(u);
    };

    if ((profile.totalCatches ?? 0) === 1) await push("first_catch");
    if (catchSeconds < 2) await push("speed_demon");
    if (catchSeconds > 60) await push("glacier");
    if ((profile.totalCatches ?? 0) >= 25) await push("collector");
    if ((profile.totalCatches ?? 0) >= 100) await push("hoarder");
    if (isMythicSlot(rarityDisplay)) await push("mythic_touch");
    if (isShinySlot(rarityDisplay)) await push("shiny_hunter");
    if (isSusSlot(rarityDisplay)) await push("sus_moment");
    if (rarityVarietyCount(profile) >= 8) await push("variety_pack");

    return unlocked;
}

export async function processGiftAchievements(
    giverId: string,
    receiverId: string,
    guildId: string,
    giverProfile: ProfileRow,
    receiverProfile: ProfileRow,
): Promise<{ giver: AchievementInfo[]; receiver: AchievementInfo[] }> {
    const giver: AchievementInfo[] = [];
    const receiver: AchievementInfo[] = [];

    if ((giverProfile.catsGifted ?? 0) >= 5) {
        const u = await tryUnlockAchievement(giverId, guildId, "generous");
        if (u) giver.push(u);
    }
    if ((receiverProfile.catGiftsRecieved ?? 0) >= 5) {
        const u = await tryUnlockAchievement(receiverId, guildId, "popular");
        if (u) receiver.push(u);
    }

    return { giver, receiver };
}

export async function processGambleAchievements(
    userId: string,
    guildId: string,
    profile: ProfileRow,
    opts?: { slotsJackpot?: boolean },
): Promise<AchievementInfo[]> {
    const unlocked: AchievementInfo[] = [];
    const push = async (key: keyof typeof ACHIEVEMENT_CATALOG) => {
        const u = await tryUnlockAchievement(userId, guildId, key);
        if (u) unlocked.push(u);
    };

    if ((profile.gambles ?? 0) === 1) await push("gamble_first");
    if ((profile.slotSpins ?? 0) === 1) await push("slots_regular");
    if (opts?.slotsJackpot) await push("slots_whale");
    if ((profile.rouletteWins ?? 0) === 1) await push("roulette_first");
    if ((profile.flipPlays ?? 0) >= 10) await push("flip_addict");
    if ((profile.rouletteBalance ?? 0) >= 5000) await push("high_roller");
    if ((profile.rouletteBalance ?? 0) >= 25000) await push("chip_hoarder");
    if ((profile.rouletteBalance ?? 0) <= 0) await push("stone_broke");

    return unlocked;
}

export async function listUnlockedAchievements(userId: string, guildId: string): Promise<AchievementInfo[]> {
    const rows = await db
        .select()
        .from(achievementUnlocks)
        .where(and(eq(achievementUnlocks.userId, userId), eq(achievementUnlocks.guildId, guildId)))
        .all();

    const list: AchievementInfo[] = [];
    for (const r of rows) {
        const meta = ACHIEVEMENT_CATALOG[r.key as keyof typeof ACHIEVEMENT_CATALOG];
        if (meta) list.push({ key: r.key, ...meta });
        else list.push({ key: r.key, title: r.key, description: "Unknown achievement." });
    }
    list.sort((a, b) => a.title.localeCompare(b.title));
    return list;
}

export function totalAchievementCount(): number {
    return Object.keys(ACHIEVEMENT_CATALOG).length;
}
