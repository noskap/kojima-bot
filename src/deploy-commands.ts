import { REST, Routes } from "discord.js";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "node:url";
import { CONFIG } from "./config";

const commands: unknown[] = [];
const commandsPath = path.join(__dirname, "commands");

async function deploy(): Promise<void> {
    if (!CONFIG.CLIENT_ID || !CONFIG.GUILD_ID) {
        console.error("Set CLIENT_ID and GUILD_ID in .env before deploying slash commands.");
        process.exit(1);
    }

    const commandFiles = fs.readdirSync(commandsPath).filter((file) => {
        if (file === "index.ts") return false;
        return file.endsWith(".ts") || file.endsWith(".js");
    });

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const commandModule = await import(pathToFileURL(filePath).href);
        const command = commandModule.default;
        if (command?.data && command.execute) {
            commands.push(command.data.toJSON());
        } else {
            console.warn(`[WARNING] Skipping ${filePath} — missing "data" or "execute".`);
        }
    }

    const rest = new REST().setToken(CONFIG.TOKEN);

    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        const data = (await rest.put(Routes.applicationGuildCommands(CONFIG.CLIENT_ID, CONFIG.GUILD_ID), {
            body: commands,
        })) as unknown[];

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

void deploy();
