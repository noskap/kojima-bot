import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { eq } from "drizzle-orm";
import type { Command } from "../index";
import { db } from "../db";
import { channels } from "../db/schema";
import { CONFIG } from "../config";
import { guildLeaderboard } from "../lib/game-db";

const command: Command = {
    data: new SlashCommandBuilder()
        .setName("kojima")
        .setDescription("Wild spawn controls & stats")
        .addSubcommand((sc) => sc.setName("setup").setDescription("Enable random spawns in this text channel"))
        .addSubcommand((sc) => sc.setName("stop").setDescription("Disable spawns in this channel"))
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
        .addSubcommand((sc) => sc.setName("leaderboard").setDescription("Top catchers in this server")),
    async execute(interaction) {
        if (!interaction.guildId || !interaction.guild) {
            await interaction.reply({ content: "Use this in a server.", ephemeral: true });
            return;
        }

        const sub = interaction.options.getSubcommand();
        const canManage = interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels);

        if (["setup", "stop", "interval"].includes(sub) && !canManage) {
            await interaction.reply({
                content: "You need **Manage Channels** for that.",
                ephemeral: true,
            });
            return;
        }

        const channelId = interaction.channelId;
        const nowSec = Math.floor(Date.now() / 1000);

        if (sub === "setup") {
            await db
                .insert(channels)
                .values({
                    id: channelId,
                    guildId: interaction.guildId,
                    cat: "0",
                    yetToSpawn: nowSec - 1,
                    spawnTimesMin: 60,
                    spawnTimesMax: 600,
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
                    ephemeral: true,
                });
                return;
            }
            const existing = await db.select().from(channels).where(eq(channels.id, channelId)).get();
            if (!existing) {
                await interaction.reply({ content: "Run `/kojima setup` in this channel first.", ephemeral: true });
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
                await interaction.reply({ content: "No catches recorded in this channel yet.", ephemeral: true });
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
                await interaction.reply({ content: "No catches yet — someone needs to grab a spawn first.", ephemeral: true });
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
        }
    },
};

export default command;
