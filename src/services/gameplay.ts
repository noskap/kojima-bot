import {
    ActionRowBuilder,
    AttachmentBuilder,
    ButtonBuilder,
    ButtonStyle,
    Client,
    MessageFlags,
    EmbedBuilder,
    ButtonInteraction,
    Message,
    PermissionFlagsBits,
    TextChannel,
    User,
    GuildMember,
} from "discord.js";
import { readFileSync } from "fs";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { channels, profiles } from "../db/schema";
import { CONFIG } from "../config";
import {
    rollRarity,
    spawnImagePathForRarity,
    profileCountKey,
    isSusSlot,
    type RarityDef,
    RARITIES,
} from "../lib/rarities";
import { randomCelebrationQuote } from "../lib/quotes";
import { getOrCreateProfile, upsertUsername } from "../lib/game-db";
import { processCatchAchievements } from "../lib/achievements";

const processingSpawnIds = new Set<string>();

/** Avoid repeating the same permission wall-of-text every tick */
const accessDeniedLogged = new Set<string>();

const pointLaughWindow = new Map<string, { count: number; windowStart: number }>();

function apiErrorCode(e: unknown): number | undefined {
    if (e && typeof e === "object" && "code" in e && typeof (e as { code: unknown }).code === "number") {
        return (e as { code: number }).code;
    }
    return undefined;
}

const SPAWN_NEED =
    PermissionFlagsBits.ViewChannel |
    PermissionFlagsBits.SendMessages |
    PermissionFlagsBits.AttachFiles |
    PermissionFlagsBits.EmbedLinks;

async function backoffSpawnRetry(channelId: string, humanReason: string): Promise<void> {
    const nowSec = Math.floor(Date.now() / 1000);
    await db
        .update(channels)
        .set({ yetToSpawn: nowSec + 600 })
        .where(eq(channels.id, channelId))
        .run();
    if (!accessDeniedLogged.has(channelId)) {
        accessDeniedLogged.add(channelId);
        console.warn(
            `[spawn] channel ${channelId}: ${humanReason}\n` +
                `  → Grant this bot **View Channel**, **Send Messages**, **Embed Links**, **Attach Files** (and in threads: **Send Messages in Threads** if relevant).\n` +
                `  → Server Settings → **Channels** / **Roles** → find the channel or bot role → enable those permissions.\n` +
                `  Retrying in ~10 minutes (or restart the bot after fixing).`,
        );
    }
}

function allowPointLaugh(channelId: string): boolean {
    const now = Date.now();
    const e = pointLaughWindow.get(channelId);
    if (!e || now - e.windowStart > 60_000) {
        pointLaughWindow.set(channelId, { count: 1, windowStart: now });
        return true;
    }
    if (e.count >= 10) return false;
    e.count++;
    return true;
}

function rarityByDisplay(display: string): RarityDef {
    return RARITIES.find((r) => r.display === display) ?? RARITIES[0]!;
}

function formatCatchDuration(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) return "0.00s";
    if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;
    if (seconds < 60) return `${seconds.toFixed(2)}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s.toFixed(1)}s`;
}

async function tryReactPointLaugh(message: Message) {
    try {
        if (!allowPointLaugh(message.channel.id)) return;
        await message.react("😂");
    } catch {
        /* ignore missing react perms */
    }
}

export async function tickSpawns(client: Client): Promise<void> {
    const rows = db.select().from(channels).all();
    const nowSec = Math.floor(Date.now() / 1000);

    for (const chRow of rows) {
        if (!chRow.guildId) continue;
        const hasSpawn = chRow.cat && chRow.cat !== "0";
        if (hasSpawn) continue;
        const dueAt = chRow.yetToSpawn ?? 0;
        if (dueAt > nowSec) continue;

        const guild = client.guilds.cache.get(chRow.guildId);
        if (!guild) continue;

        try {
            await postSpawn(client, chRow.guildId, chRow.id, {});
        } catch (e) {
            const code = apiErrorCode(e);
            if (code === 50001 || code === 50013) {
                await backoffSpawnRetry(chRow.id, `Discord blocked posting (${code === 50001 ? "Missing Access" : "Missing Permissions"}).`);
            } else {
                console.error(`[spawn] failed channel ${chRow.id}:`, e);
            }
        }
    }
}

type PostSpawnOpts = { forcedRarity?: RarityDef };

/** @returns whether a spawn message was posted and DB updated */
async function postSpawn(client: Client, guildId: string, channelId: string, opts: PostSpawnOpts): Promise<boolean> {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return false;

    const raw = await guild.channels.fetch(channelId).catch(() => null);
    if (!raw?.isTextBased() || raw.isDMBased()) return false;
    const textChannel = raw as TextChannel;

    const me = guild.members.me;
    if (me) {
        const perms = textChannel.permissionsFor(me);
        let need = SPAWN_NEED;
        if ("isThread" in raw && raw.isThread()) {
            need |= PermissionFlagsBits.SendMessagesInThreads;
        }
        if (!perms?.has(need)) {
            await backoffSpawnRetry(
                channelId,
                "Bot lacks permission to post embeds + files here (check View Channel, Send Messages, Attach Files, Embed Links, and in threads: Send in Threads).",
            );
            return false;
        }
    }

    const rarity = opts.forcedRarity ?? rollRarity();
    const imgPath = spawnImagePathForRarity(rarity);
    const buffer = readFileSync(imgPath);
    const attachment = new AttachmentBuilder(buffer, { name: "spawn.png" });

    const embed = new EmbedBuilder()
        .setTitle(`${rarity.display} ${CONFIG.ENTITY_NAME} appeared!`)
        .setDescription(
            `Type **${CONFIG.CATCH_TRIGGER}** in chat or hit **Catch**.\n` + `_First come, first served._`,
        )
        .setColor(rarity.color)
        .setImage("attachment://spawn.png");

    const sent = await textChannel.send({
        embeds: [embed],
        files: [attachment],
    });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(`kojima_catch:${textChannel.id}:${sent.id}`)
            .setLabel("Catch!")
            .setStyle(ButtonStyle.Success),
    );

    await sent.edit({ components: [row] });

    await db
        .update(channels)
        .set({
            cat: String(sent.id),
            catType: rarity.display,
            yetToSpawn: 0,
        })
        .where(eq(channels.id, channelId))
        .run();

    accessDeniedLogged.delete(channelId);
    return true;
}

export type ForceSpawnResult = { ok: true } | { ok: false; reason: string };

/** Clear any active spawn in DB/Discord, then post one immediately (used by `/kojima forcespawn`). */
export async function forceSpawnNow(
    client: Client,
    guildId: string,
    channelId: string,
    forcedRarity?: RarityDef,
): Promise<ForceSpawnResult> {
    const row = await db.select().from(channels).where(eq(channels.id, channelId)).get();
    if (!row?.guildId) {
        return { ok: false, reason: "This channel is not set up. Run `/kojima setup` first." };
    }
    if (row.guildId !== guildId) {
        return { ok: false, reason: "Channel data mismatch — try `/kojima setup` again." };
    }

    if (row.cat && row.cat !== "0") {
        const guild = await client.guilds.fetch(guildId).catch(() => null);
        const raw = guild ? await guild.channels.fetch(channelId).catch(() => null) : null;
        if (raw?.isTextBased() && !raw.isDMBased()) {
            const msg = await raw.messages.fetch(row.cat).catch(() => null);
            await msg?.delete().catch(() => {});
        }
    }

    await db
        .update(channels)
        .set({ cat: "0", yetToSpawn: 0 })
        .where(eq(channels.id, channelId))
        .run();

    try {
        const posted = await postSpawn(client, guildId, channelId, { forcedRarity });
        if (!posted) {
            return { ok: false, reason: "Could not post (bot needs View/Send/Embed/Attach in this channel)." };
        }
    } catch (e) {
        const code = apiErrorCode(e);
        if (code === 50001 || code === 50013) {
            await backoffSpawnRetry(channelId, "Discord blocked posting when forcing spawn.");
        } else {
            console.error("[forcespawn]", e);
        }
        return { ok: false, reason: "Could not post the spawn (permissions or network). Check bot channel access." };
    }

    return { ok: true };
}

export async function handleCatchButton(interaction: ButtonInteraction): Promise<void> {
    if (!interaction.customId.startsWith("kojima_catch:")) return;
    const parts = interaction.customId.split(":");
    const channelId = parts[1];
    const messageId = parts[2];
    if (!channelId || !messageId) return;
    if (interaction.channelId !== channelId) {
        await interaction
            .reply({ content: "This button belongs to another channel.", flags: MessageFlags.Ephemeral })
            .catch(() => {});
        return;
    }

    await interaction.deferUpdate().catch(() => {});

    const row = await db.select().from(channels).where(eq(channels.id, channelId)).get();
    if (!row || row.cat !== messageId) {
        await interaction.followUp({
            content: "Too slow — that spawn is already gone.",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const spawnMessage = interaction.message;
    if (!spawnMessage?.id) return;

    await executeCatch({
        interaction: interaction,
        guildId: interaction.guildId!,
        channelId,
        user: interaction.user,
        member: interaction.member as GuildMember | null,
        spawnMessage,
        spawnRow: row,
    });
}

export async function handleCatchText(message: Message): Promise<void> {
    if (message.author.bot) return;
    if (!message.guild) return;
    const text = message.content.trim().toLowerCase();
    if (text !== CONFIG.CATCH_TRIGGER) return;

    const channelId = message.channel.id;
    const row = await db.select().from(channels).where(eq(channels.id, channelId)).get();

    if (!row || !row.cat || row.cat === "0") {
        await tryReactPointLaugh(message);
        return;
    }

    let spawnMessage: Message;
    try {
        spawnMessage = await message.channel.messages.fetch(row.cat);
    } catch {
        await db
            .update(channels)
            .set({ cat: "0", yetToSpawn: Math.floor(Date.now() / 1000) + 30 })
            .where(eq(channels.id, channelId))
            .run();
        return;
    }

    await executeCatch({
        interaction: undefined,
        guildId: message.guildId!,
        channelId,
        user: message.author,
        member: message.member,
        spawnMessage,
        spawnRow: row,
        sourceMessage: message,
    });
}

async function executeCatch(opts: {
    interaction?: ButtonInteraction;
    guildId: string;
    channelId: string;
    user: User;
    member: GuildMember | null;
    spawnMessage: Message;
    spawnRow: typeof channels.$inferSelect;
    sourceMessage?: Message;
}): Promise<void> {
    const { spawnMessage, user, member, guildId, channelId, interaction, sourceMessage } = opts;
    const mid = spawnMessage.id;

    if (processingSpawnIds.has(mid)) return;
    processingSpawnIds.add(mid);

    try {
        const fresh = await db.select().from(channels).where(eq(channels.id, channelId)).get();
        if (!fresh || fresh.cat !== spawnMessage.id) {
            if (interaction) {
                await interaction.followUp({
                    content: "Someone beat you to it!",
                    flags: MessageFlags.Ephemeral,
                });
            }
            return;
        }

        const rarityDisplay = fresh.catType || RARITIES[0]!.display;
        const rarityMeta = rarityByDisplay(rarityDisplay);

        const catchEndMs = interaction?.createdTimestamp ?? sourceMessage?.createdTimestamp ?? Date.now();
        const catchSeconds = Math.max(0, (catchEndMs - spawnMessage.createdTimestamp) / 1000);

        await upsertUsername(user.id, user.username);
        const profile = await getOrCreateProfile(user.id, guildId);

        const countKey = profileCountKey(rarityDisplay);
        const prevTotal = profile.totalCatches ?? 0;
        const prevBest = profile.time ?? 99999999999999;
        const prevSlow = profile.timeSlow ?? 0;

        const profileUpd: Record<string, string | number | boolean | null> = {
            totalCatches: prevTotal + 1,
            totalCatchTime: (profile.totalCatchTime ?? 0) + Math.round(catchSeconds),
            funny: (profile.funny ?? 0) + 1,
        };

        if (countKey) {
            profileUpd[countKey] = ((profile[countKey] as number) ?? 0) + 1;
        }

        if (catchSeconds < prevBest) profileUpd.time = catchSeconds;
        if (catchSeconds > prevSlow) profileUpd.timeSlow = catchSeconds;

        await db.update(profiles).set(profileUpd as never).where(eq(profiles.id, profile.id)).run();

        const profileAfter = await db.select().from(profiles).where(eq(profiles.id, profile.id)).get();
        const newAchievements = profileAfter
            ? await processCatchAchievements(user.id, guildId, {
                  profile: profileAfter,
                  catchSeconds,
                  rarityDisplay,
              })
            : [];

        const minS = fresh.spawnTimesMin ?? 60;
        const maxS = fresh.spawnTimesMax ?? 600;
        const span = Math.max(0, maxS - minS);
        const delaySec = minS + Math.floor(Math.random() * (span + 1));
        const nowSec = Math.floor(Date.now() / 1000);

        const displayName = member?.displayName ?? user.username;

        await db
            .update(channels)
            .set({
                cat: "0",
                yetToSpawn: nowSec + delaySec + 10,
                lastCatches: nowSec,
                lastCatcherId: user.id,
                lastCatcherName: displayName,
                lastCatchRarity: rarityDisplay,
            })
            .where(eq(channels.id, channelId))
            .run();

        try {
            await spawnMessage.delete();
        } catch {
            await spawnMessage.edit({ components: [] }).catch(() => {});
        }

        const quote = randomCelebrationQuote(CONFIG.ENTITY_NAME);
        const timeStr = formatCatchDuration(catchSeconds);

        const celebrate = new EmbedBuilder()
            .setTitle(`${rarityMeta.display} ${CONFIG.ENTITY_NAME} caught!`)
            .setDescription(
                `**${displayName}** got it in **${timeStr}**!\n\n${quote}` +
                    (isSusSlot(rarityDisplay) && Math.random() < 0.15 ? "\n\n_Not suspicious at all._" : ""),
            )
            .setColor(rarityMeta.color)
            .setFooter({ text: `Your catches (this server): ${prevTotal + 1}` });

        if (newAchievements?.length) {
            celebrate.addFields({
                name: "🏆 Achievement unlocked",
                value: newAchievements.map((a) => `**${a.title}** — ${a.description}`).join("\n"),
            });
        }

        const textCh = spawnMessage.channel;
        if (textCh.isTextBased() && !textCh.isDMBased()) {
            await textCh.send({
                embeds: [celebrate],
                allowedMentions: { users: [user.id] },
            });
        }
    } catch (e) {
        console.error("[catch]", e);
        if (interaction) {
            await interaction.followUp({
                content: "Something broke while processing that catch.",
                flags: MessageFlags.Ephemeral,
            });
        }
    } finally {
        processingSpawnIds.delete(mid);
    }
}

export function startGameplayLoops(client: Client): void {
    setInterval(() => {
        void tickSpawns(client);
    }, 4000);
}
