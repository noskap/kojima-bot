import { SlashCommandBuilder } from "discord.js";
import { Command } from "../index";

const command: Command = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Replies with Pong!"),
    async execute(interaction) {
        await interaction.reply({ content: `Pong! Latency: ${Date.now() - interaction.createdTimestamp}ms`, ephemeral: true });
    }
};

export default command;
