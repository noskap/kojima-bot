import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { Command } from "../index";

const command: Command = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Replies with Pong!"),
    async execute(interaction) {
        await interaction.reply({
            content: `Pong! Latency: ${Date.now() - interaction.createdTimestamp}ms`,
            flags: MessageFlags.Ephemeral,
        });
    }
};

export default command;
