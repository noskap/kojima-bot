import { REST, Routes } from "discord.js";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "node:url";
import { CONFIG } from "./config";
import { MEME_GUILD_COMMAND_CAP, buildMemeSlashBodies } from "./lib/meme-commands";

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

    const coreNames = new Set(
        commands.map((c) => {
            const o = c as { name?: string };
            return o?.name ?? "";
        }),
    );

    const roomForMemes = Math.max(0, MEME_GUILD_COMMAND_CAP - commands.length);
    const memeBodies = buildMemeSlashBodies(coreNames, roomForMemes);
    commands.push(...memeBodies);

    if (commands.length > MEME_GUILD_COMMAND_CAP) {
        console.warn(`Trimming slash commands from ${commands.length} to cap ${MEME_GUILD_COMMAND_CAP}.`);
        commands.length = MEME_GUILD_COMMAND_CAP;
    }

    const rest = new REST().setToken(CONFIG.TOKEN);

    try {
        // Wipe GLOBAL commands — otherwise orphans stay visible everywhere (guild + global merge).
        await rest.put(Routes.applicationCommands(CONFIG.CLIENT_ID), { body: [] });
        console.log("Cleared global application commands for this bot.");

        console.log(`Publishing ${commands.length} guild slash commands for GUILD_ID (full replace → old ones removed).`);

        const data = (await rest.put(Routes.applicationGuildCommands(CONFIG.CLIENT_ID, CONFIG.GUILD_ID), {
            body: commands,
        })) as unknown[];

        console.log(`Guild PUT OK — ${data.length} commands visible in this server.`);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

void deploy();
