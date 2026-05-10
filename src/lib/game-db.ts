import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import { profiles, users } from "../db/schema";

export async function getOrCreateProfile(userId: string, guildId: string) {
    let row = await db
        .select()
        .from(profiles)
        .where(and(eq(profiles.userId, userId), eq(profiles.guildId, guildId)))
        .get();
    if (!row) {
        await db.insert(profiles).values({ userId, guildId }).run();
        row = await db
            .select()
            .from(profiles)
            .where(and(eq(profiles.userId, userId), eq(profiles.guildId, guildId)))
            .get();
    }
    if (!row) throw new Error("Failed to create profile");
    return row;
}

export async function upsertUsername(userId: string, username: string) {
    await db
        .insert(users)
        .values({ id: userId, username })
        .onConflictDoUpdate({
            target: users.id,
            set: { username },
        })
        .run();
}

export async function guildLeaderboard(guildId: string, limit = 10) {
    return db
        .select({
            userId: profiles.userId,
            totalCatches: profiles.totalCatches,
        })
        .from(profiles)
        .where(eq(profiles.guildId, guildId))
        .orderBy(desc(profiles.totalCatches))
        .limit(limit)
        .all();
}
