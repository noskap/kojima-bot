import { REST, Routes } from "discord.js";
import { CONFIG } from "./config";
import fs from "fs";
import path from "path";

const commands = [];
const commandsPath = path.join(__dirname, "commands");
// Supports .ts (running with bun) and .js
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".ts") || file.endsWith(".js"));

// Using top-level await (Bun supports it)
async function deploy() {
    for (const file of commandFiles) {
        if (file === "index.ts") continue;
        const filePath = path.join(commandsPath, file);
        const commandModule = await import(filePath);
        const command = commandModule.default;
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
        } else {
            console.warn(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }

    const rest = new REST().setToken(CONFIG.TOKEN);

    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        // Deploy to single guild (faster update)
        const data = await rest.put(
            Routes.applicationGuildCommands(CONFIG.CLIENT_ID, CONFIG.GUILD_ID),
            { body: commands },
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error(error);
    }
}

deploy();
