import { Client, GatewayIntentBits, Collection, Events, MessageFlags } from "discord.js";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "node:url";
import { CONFIG } from "./config";
import { registerMemeSlashHandlers } from "./lib/meme-commands";
import { initDB } from "./db";
import { handleCatchButton, handleCatchText, startGameplayLoops } from "./services/gameplay";
import { handleWordReactions, primeWordReactionEmojis } from "./services/word-reactions";

export interface Command {
    data: { name: string; toJSON: () => unknown };
    execute: (interaction: import("discord.js").ChatInputCommandInteraction) => Promise<void>;
}

class BotClient extends Client {
    commands: Collection<string, Command>;

    constructor() {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ],
        });
        this.commands = new Collection();
    }
}

const client = new BotClient();

const commandsPath = path.join(__dirname, "commands");

async function loadCommands(): Promise<void> {
    const commandFiles = fs.readdirSync(commandsPath).filter((file) => {
        if (file === "index.ts") return false;
        return file.endsWith(".ts") || file.endsWith(".js");
    });

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const commandModule = await import(pathToFileURL(filePath).href);
        const command = commandModule.default as Command | undefined;
        if (command?.data && command.execute) {
            client.commands.set(command.data.name, command);
            console.log(`Loaded command: ${command.data.name}`);
        } else {
            console.warn(`[WARNING] Skipping ${filePath} — missing "data" or "execute".`);
        }
    }
}

async function main(): Promise<void> {
    await loadCommands();
    registerMemeSlashHandlers(client.commands);

    client.once(Events.ClientReady, async (c) => {
        console.log(`Ready! Logged in as ${c.user.tag}`);
        initDB();
        await primeWordReactionEmojis(c);
        startGameplayLoops(client);
    });

    client.on(Events.MessageCreate, (message) => {
        void handleCatchText(message);
        void handleWordReactions(client, message);
    });

    client.on(Events.InteractionCreate, async (interaction) => {
        if (interaction.isButton() && interaction.customId.startsWith("kojima_catch:")) {
            await handleCatchButton(interaction);
            return;
        }

        if (!interaction.isChatInputCommand()) return;

        const cmd = client.commands.get(interaction.commandName);
        if (!cmd) {
            console.error(`No command matching ${interaction.commandName}`);
            return;
        }

        try {
            await cmd.execute(interaction);
        } catch (error) {
            console.error(error);
            const payload = { content: "There was an error while executing this command!", flags: MessageFlags.Ephemeral };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(payload);
            } else {
                await interaction.reply(payload);
            }
        }
    });

    await client.login(CONFIG.TOKEN);
}

void main();
