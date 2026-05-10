import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } from "discord.js";
import { eq } from "drizzle-orm";
import type { Command } from "../index";
import { db } from "../db";
import { channels, profiles } from "../db/schema";
import { CONFIG } from "../config";
import { RARITIES } from "../lib/rarities";
import { getOrCreateProfile, guildLeaderboard } from "../lib/game-db";
import { executeForceSpawnSlash } from "../lib/force-spawn-slash";
import { listUnlockedAchievements, processGiftAchievements, totalAchievementCount } from "../lib/achievements";

const command: Command = {
    data: new SlashCommandBuilder()
        .setName("kojima")
        .setDescription("Wild spawn controls & stats")
        .addSubcommand((sc) =>
            sc
                .setName("forcespawn")
                .setDescription("Post a spawn immediately (optional type; clears an active spawn)")
                .addStringOption((o) => {
                    const opt = o
                        .setName("type")
                        .setDescription("Spawn this type, or random if omitted")
                        .setRequired(false);
                    return opt.addChoices(...RARITIES.slice(0, 25).map((r) => ({ name: r.display, value: r.display })));
                }),
        )
        .addSubcommand((sc) => sc.setName("setup").setDescription("Enable random spawns in this text channel"))
        .addSubcommand((sc) => sc.setName("stop").setDescription("Disable spawns in this channel"))
        .addSubcommand((sc) =>
            sc
                .setName("next")
                .setDescription("When random spawns can post here (scheduled / active spawn)")
        )
        .addSubcommand((sc) =>
            sc
                .setName("interval")
                .setDescription("Set seconds between spawns (min–max, after each catch)")
                .addIntegerOption((o) =>
                    o
                        .setName("min_seconds")
                        .setDescription("Minimum gap")
                        .setRequired(true)
                        .setMinValue(15)
                        .setMaxValue(7200),
                )
                .addIntegerOption((o) =>
                    o
                        .setName("max_seconds")
                        .setDescription("Maximum gap")
                        .setRequired(true)
                        .setMinValue(15)
                        .setMaxValue(7200),
                ),
        )
        .addSubcommand((sc) => sc.setName("last").setDescription("Last catch recorded for this channel"))
        .addSubcommand((sc) => sc.setName("leaderboard").setDescription("Top catchers in this server"))
        .addSubcommand((sc) =>
            sc
                .setName("gift")
                .setDescription("Give another member a gift shout-out (tracks stats)")
                .addUserOption((o) => o.setName("user").setDescription("Recipient").setRequired(true))
                .addStringOption((o) =>
                    o.setName("note").setDescription("Optional message").setMaxLength(200),
                ),
        )
        .addSubcommand((sc) =>
            sc
                .setName("achievements")
                .setDescription("Show unlocked achievements")
                .addUserOption((o) => o.setName("user").setDescription("Whose list to show")),
        ),
    async execute(interaction) {
        if (!interaction.guildId || !interaction.guild) {
            await interaction.reply({ content: "Use this in a server.", flags: MessageFlags.Ephemeral });
            return;
        }

        const sub = interaction.options.getSubcommand();
        const canManage = interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels);

        if (["setup", "stop", "interval", "forcespawn", "next"].includes(sub) && !canManage) {
            await interaction.reply({
                content: "You need **Manage Channels** for that.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const channelId = interaction.channelId;
        const nowSec = Math.floor(Date.now() / 1000);

        if (sub === "forcespawn") {
            await executeForceSpawnSlash(interaction);
            return;
        }

        if (sub === "next") {
            const row = await db.select().from(channels).where(eq(channels.id, channelId)).get();
            if (!row?.guildId) {
                await interaction.reply({
                    content: "Spawns aren’t configured here yet — run `/kojima setup` first.",
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            const minS = row.spawnTimesMin ?? 60;
            const maxS = row.spawnTimesMax ?? 450;
            const due = row.yetToSpawn ?? 0;

            let text = "";

            if (row.cat && row.cat !== "0") {
                const gid = interaction.guildId;
                const jump = `https://discord.com/channels/${gid}/${channelId}/${row.cat}`;
                text +=
                    `There is already an **active ${CONFIG.ENTITY_NAME} spawn** ([open message](${jump})). The bot won’t queue another random spawn until someone catches it (or \`/kojima forcespawn\` clears it).\n\n`;
                text +=
                    `_After each catch,_ the bot waits **${minS}–${maxS}** s (\`+ ~10 s\`) before posting the next spawn (checked every ~4 s).\n`;
            } else if (due > nowSec) {
                text += `Random spawns are **on hold until** <t:${due}:F> (<t:${due}:R>).\n\n`;
                text += `_Idle gap after each catch is **${minS}–${maxS}** s + a small tick buffer._`;
            } else {
                text += `This channel **can get a spawn on the bot’s ~4 second tick** (there is no spawn message right now and the timer gate is cleared).\n\n`;
                text += `_After catches, spacing is random **${minS}–${maxS}** s + tick buffer._`;
            }

            await interaction.reply({
                embeds: [new EmbedBuilder().setTitle(`${CONFIG.ENTITY_NAME} spawn schedule`).setDescription(text).setColor(0x5865f2)],
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        if (sub === "setup") {
            await db
                .insert(channels)
                .values({
                    id: channelId,
                    guildId: interaction.guildId,
                    cat: "0",
                    yetToSpawn: nowSec - 1,
                    spawnTimesMin: 60,
                    spawnTimesMax: 450,
                })
                .onConflictDoUpdate({
                    target: channels.id,
                    set: {
                        guildId: interaction.guildId,
                        cat: "0",
                        yetToSpawn: nowSec - 1,
                    },
                })
                .run();

            await interaction.reply(
                `Random **${CONFIG.ENTITY_NAME}** spawns enabled in this channel. First spawn incoming.\n` +
                    `Type **${CONFIG.CATCH_TRIGGER}** (or use the **Catch** button) when one appears.`,
            );
            return;
        }

        if (sub === "stop") {
            await db.delete(channels).where(eq(channels.id, channelId)).run();
            await interaction.reply(
                "Spawns disabled here. Any old spawn message can be deleted manually if it is still sitting around.",
            );
            return;
        }

        if (sub === "interval") {
            const min = interaction.options.getInteger("min_seconds", true);
            const max = interaction.options.getInteger("max_seconds", true);
            if (min > max) {
                await interaction.reply({
                    content: "`min_seconds` must be less than or equal to `max_seconds`.",
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }
            const existing = await db.select().from(channels).where(eq(channels.id, channelId)).get();
            if (!existing) {
                await interaction.reply({
                    content: "Run `/kojima setup` in this channel first.",
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }
            await db
                .update(channels)
                .set({ spawnTimesMin: min, spawnTimesMax: max })
                .where(eq(channels.id, channelId))
                .run();
            await interaction.reply(`Spawn spacing updated: **${min}–${max}** seconds after each catch.`);
            return;
        }

        if (sub === "last") {
            const row = await db.select().from(channels).where(eq(channels.id, channelId)).get();
            if (!row?.lastCatcherId || !row.lastCatchRarity) {
                await interaction.reply({
                    content: "No catches recorded in this channel yet.",
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }
            const when = row.lastCatches ? `<t:${row.lastCatches}:R>` : "some time ago";
            await interaction.reply(
                `Last catch here: **${row.lastCatcherName || "Someone"}** grabbed a **${row.lastCatchRarity}** ` +
                    `${CONFIG.ENTITY_NAME} (${when}).`,
            );
            return;
        }

        if (sub === "leaderboard") {
            const rows = await guildLeaderboard(interaction.guildId, 10);
            if (!rows.length) {
                await interaction.reply({
                    content: "No catches yet — someone needs to grab a spawn first.",
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }
            const lines: string[] = [];
            for (let i = 0; i < rows.length; i++) {
                const r = rows[i]!;
                try {
                    const u = await interaction.client.users.fetch(r.userId);
                    lines.push(`**${i + 1}.** ${u.username} — **${r.totalCatches ?? 0}**`);
                } catch {
                    lines.push(`**${i + 1}.** <@${r.userId}> — **${r.totalCatches ?? 0}**`);
                }
            }
            await interaction.reply({
                content: `**Top ${CONFIG.ENTITY_NAME} catchers**\n\n${lines.join("\n")}`,
            });
            return;
        }

        if (sub === "gift") {
            const target = interaction.options.getUser("user", true);
            const note = interaction.options.getString("note");

            if (target.id === interaction.user.id) {
                await interaction.reply({
                    content: "Gift someone else — generosity is about *others*.",
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }
            if (target.bot) {
                await interaction.reply({
                    content: "Bots run on electricity, not compliments.",
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            const giverProf = await getOrCreateProfile(interaction.user.id, interaction.guildId);
            const recvProf = await getOrCreateProfile(target.id, interaction.guildId);

            await db
                .update(profiles)
                .set({ catsGifted: (giverProf.catsGifted ?? 0) + 1 } as never)
                .where(eq(profiles.id, giverProf.id))
                .run();
            await db
                .update(profiles)
                .set({ catGiftsRecieved: (recvProf.catGiftsRecieved ?? 0) + 1 } as never)
                .where(eq(profiles.id, recvProf.id))
                .run();

            const gFresh = (await db.select().from(profiles).where(eq(profiles.id, giverProf.id)).get())!;
            const rFresh = (await db.select().from(profiles).where(eq(profiles.id, recvProf.id)).get())!;
            const { giver: ga, receiver: ra } = await processGiftAchievements(
                interaction.user.id,
                target.id,
                interaction.guildId,
                gFresh,
                rFresh,
            );

            let extra = "";
            if (ga.length || ra.length) {
                const bits = [...ga.map((a) => `**${a.title}** (giver)`), ...ra.map((a) => `**${a.title}** (${target.username})`)];
                extra = "\n\n🏆 " + bits.join(", ");
            }

            const embed = new EmbedBuilder()
                .setTitle("Gift delivered")
                .setDescription(
                    `**${interaction.user.username}** sent a gift to **${target.username}**!\n` +
                        (note ? `\n_${note}_\n` : "") +
                        `\n_${CONFIG.ENTITY_NAME}-themed friendship increases._` +
                        extra,
                )
                .setColor(0xff69b4);

            await interaction.reply({
                content: `${target}`,
                embeds: [embed],
                allowedMentions: { users: [target.id] },
            });
            return;
        }

        if (sub === "achievements") {
            const target = interaction.options.getUser("user") || interaction.user;
            const list = await listUnlockedAchievements(target.id, interaction.guildId);
            const total = totalAchievementCount();
            const lines = list.length
                ? list.map((a) => `• **${a.title}** — ${a.description}`).join("\n")
                : "_Nothing unlocked yet — catch spawns, gamble, or gift friends._";

            const embed = new EmbedBuilder()
                .setTitle(`${target.username}'s achievements`)
                .setDescription(`**${list.length}/${total}** unlocked\n\n${lines}`)
                .setColor(0x57f287);

            await interaction.reply({
                embeds: [embed],
                ...(target.id !== interaction.user.id ? { flags: MessageFlags.Ephemeral } : {}),
            });
        }
    },
};

export default command;
