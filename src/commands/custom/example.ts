import { SlashCommandBuilder } from "discord.js";
import { Command } from "../../index";
import { CONFIG } from "../../config";

const command: Command = {
    data: new SlashCommandBuilder()
        .setName("mycommand")
        .setDescription("A custom command example!"),
    async execute(interaction) {
        // You can use CONFIG.ENTITY_NAME here too!
        await interaction.reply({
            content: `Hello! This is a custom command. I see you like ${CONFIG.ENTITY_NAME}s!`,
            ephemeral: true
        });
    }
};

export default command;
