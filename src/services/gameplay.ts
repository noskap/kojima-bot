import {
    ActionRowBuilder,
    AttachmentBuilder,
    ButtonBuilder,
    ButtonStyle,
    Client,
    EmbedBuilder,
    ButtonInteraction,
    Message,
    TextChannel,
    User,
    GuildMember,
} from "discord.js";
import { readFileSync } from "fs";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { channels, profiles } from "../db/schema";
import { CONFIG } from "../config";
import { rollRarity, spawnImagePathForRarity, profileCountKey, type RarityDef, RARITIES } from "../lib/rarities";
import { randomCelebrationQuote } from "../lib/quotes";
import { getOrCreateProfile, upsertUsername } from "../lib/game-db";
import { processCatchAchievements } from "../lib/achievements";
import { generateCatchImage } from "../utils/image-gen";

const processingSpawnIds = new Set<string>();

const pointLaughWindow = new Map<string, { count: number; windowStart: number }>();

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
            await postSpawn(client, chRow.guildId, chRow.id);
        } catch (e) {
            console.error(`[spawn] failed channel ${chRow.id}:`, e);
        }
    }
}

async function postSpawn(client: Client, guildId: string, channelId: string): Promise<void> {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;

    const raw = await guild.channels.fetch(channelId).catch(() => null);
    if (!raw?.isTextBased() || raw.isDMBased()) return;
    const textChannel = raw as TextChannel;

    const rarity = rollRarity();
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
}

export async function handleCatchButton(interaction: ButtonInteraction): Promise<void> {
    if (!interaction.customId.startsWith("kojima_catch:")) return;
    const parts = interaction.customId.split(":");
    const channelId = parts[1];
    const messageId = parts[2];
    if (!channelId || !messageId) return;
    if (interaction.channelId !== channelId) {
        await interaction
            .reply({ content: "This button belongs to another channel.", ephemeral: true })
            .catch(() => {});
        return;
    }

    await interaction.deferUpdate().catch(() => {});

    const row = await db.select().from(channels).where(eq(channels.id, channelId)).get();
    if (!row || row.cat !== messageId) {
        await interaction.followUp({
            content: "Too slow — that spawn is already gone.",
            ephemeral: true,
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
                    ephemeral: true,
                });
            }
            return;
        }

        const rarityDisplay = fresh.catType || "Fine";
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

        const fakeMsg: Pick<Message, "author" | "content" | "cleanContent" | "createdTimestamp"> & {
            member?: GuildMember | null;
            guild?: Message["guild"];
        } = {
            author: user,
            content: quote,
            cleanContent: quote,
            createdTimestamp: Date.now(),
            member: member ?? undefined,
            guild: spawnMessage.guild ?? undefined,
        };

        const catchImage = await generateCatchImage(fakeMsg as Message, member ?? user);

        const celebrate = new EmbedBuilder()
            .setTitle(`${rarityMeta.display} ${CONFIG.ENTITY_NAME} caught!`)
            .setDescription(
                `**${displayName}** got it in **${timeStr}**!\n\n${quote}` +
                    (rarityDisplay === "Sus" && Math.random() < 0.15 ? "\n\n_Not suspicious at all._" : ""),
            )
            .setColor(rarityMeta.color)
            .setImage("attachment://catch.png")
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
                files: [catchImage],
                allowedMentions: { users: [user.id] },
            });
        }
    } catch (e) {
        console.error("[catch]", e);
        if (interaction) {
            await interaction.followUp({
                content: "Something broke while processing that catch.",
                ephemeral: true,
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
