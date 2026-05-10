import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { eq, and } from "drizzle-orm";
import type { Command } from "../index";
import { db } from "../db";
import { profiles } from "../db/schema";
import { CONFIG } from "../config";
import { RARITIES, profileCountKey } from "../lib/rarities";

function formatTopRarities(row: typeof profiles.$inferSelect): string {
    const scored: { name: string; n: number }[] = [];
    for (const r of RARITIES) {
        const key = profileCountKey(r.display);
        if (!key) continue;
        const n = (row[key] as number) ?? 0;
        if (n > 0) scored.push({ name: r.display, n });
    }
    scored.sort((a, b) => b.n - a.n);
    if (!scored.length) return "None yet — keep catching!";
    return scored
        .slice(0, 6)
        .map((s) => `**${s.name}**: ${s.n}`)
        .join("\n");
}

function formatBestTime(t: number | null | undefined): string {
    if (t == null || t >= 9999999999999) return "—";
    if (t < 60) return `${t.toFixed(2)}s`;
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${m}m ${s.toFixed(1)}s`;
}

const command: Command = {
    data: new SlashCommandBuilder()
        .setName("profile")
        .setDescription(`Your ${CONFIG.ENTITY_NAME} stats in this server`)
        .addUserOption((o) => o.setName("user").setDescription("Whose profile to show").setRequired(false)),
    async execute(interaction) {
        if (!interaction.guildId) {
            await interaction.reply({ content: "Use this in a server.", ephemeral: true });
            return;
        }

        const targetUser = interaction.options.getUser("user") || interaction.user;

        const row = await db
            .select()
            .from(profiles)
            .where(and(eq(profiles.userId, targetUser.id), eq(profiles.guildId, interaction.guildId)))
            .get();

        if (!row || (row.totalCatches ?? 0) === 0) {
            await interaction.reply({
                content: `${targetUser.username} has not caught any **${CONFIG.ENTITY_NAME}** here yet.`,
                ephemeral: true,
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle(`${targetUser.username}'s ${CONFIG.ENTITY_NAME} profile`)
            .setColor(0x00ae86)
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields(
                { name: "Total catches", value: `${row.totalCatches ?? 0}`, inline: true },
                { name: "Best time", value: formatBestTime(row.time ?? undefined), inline: true },
                { name: "Rarest flex (counts)", value: formatTopRarities(row), inline: false },
            );

        await interaction.reply({ embeds: [embed] });
    },
};

export default command;
