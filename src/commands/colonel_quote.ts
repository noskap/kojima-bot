import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import type { Command } from "../index";
import { CONFIG } from "../config";
import { randomColonelQuote } from "../lib/quotes";

const command: Command = {
    data: new SlashCommandBuilder()
        .setName("colonel")
        .setDescription("Random Codec-style Colonel line (from the colonel playbook)"),
    async execute(interaction) {
        const text = randomColonelQuote(CONFIG.ENTITY_NAME);
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle("Colonel")
                    .setDescription(text.length > 4096 ? `${text.slice(0, 4090)}…` : text)
                    .setColor(0x3498db),
            ],
        });
    },
};

export default command;
