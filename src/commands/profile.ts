import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { Command } from "../index";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { CONFIG } from "../config";

const command: Command = {
    data: new SlashCommandBuilder()
        .setName("profile")
        .setDescription(`View your ${CONFIG.ENTITY_NAME} collection stats.`)
        .addUserOption(option =>
            option.setName("user").setDescription("The user to view").setRequired(false)
        ),
    async execute(interaction) {
        const targetUser = interaction.options.getUser("user") || interaction.user;

        const userProfile = await db.select().from(users).where(eq(users.id, targetUser.id)).get();

        if (!userProfile) {
            await interaction.reply({ content: `${targetUser.username} hasn't caught any ${CONFIG.ENTITY_NAME}s yet.`, ephemeral: true });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle(`${targetUser.username}'s Profile`)
            .setColor(0x00AE86)
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields(
                { name: `Total ${CONFIG.ENTITY_NAME}s`, value: `${userProfile.totalCatches}`, inline: true },
                // Add more stats as we implement rarity tracking columns
            );

        await interaction.reply({ embeds: [embed] });
    }
};

export default command;
