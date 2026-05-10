import { Client, GatewayIntentBits, Collection, Events, MessageFlags } from "discord.js";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "node:url";
import { CONFIG } from "./config";
import { registerMemeSlashHandlers } from "./lib/meme-commands";
import { initDB } from "./db";
import { handleCatchButton, handleCatchText, startGameplayLoops } from "./services/gameplay";
import { handleWordReactions, primeWordReactionEmojis } from "./services/word-reactions";
import { logLinkFixupStartup, maybeFixupEmbeddedLinks } from "./services/link-fixup";

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
        logLinkFixupStartup();
        initDB();
        await primeWordReactionEmojis(c);
        startGameplayLoops(client);
    });

    client.on(Events.MessageCreate, (message) => {
        void handleCatchText(message);
        void handleWordReactions(client, message);
        void maybeFixupEmbeddedLinks(message);
    });

    client.on(Events.InteractionCreate, async (interaction) => {
        if (interaction.isButton() && interaction.customId.startsWith("kojima_catch:")) {
            await handleCatchButton(interaction);
            return;
        }

        if (!interaction.isChatInputCommand()) return;

        const { commandName } = interaction;
        const cmd = client.commands.get(commandName);
        if (!cmd) {
            console.warn(
                `[slash] unknown "${commandName}" user=${interaction.user.tag} (${interaction.user.id}) guild=${interaction.guildId ?? "DM"} channel=${interaction.channelId}`,
            );
            return;
        }

        const ctx = `user=${interaction.user.tag} (${interaction.user.id}) guild=${interaction.guildId ?? "DM"} channel=${interaction.channelId}`;
        const t0 = Date.now();
        console.log(`[slash] start /${commandName} ${ctx}`);

        try {
            await cmd.execute(interaction);
            console.log(`[slash] ok /${commandName} (${Date.now() - t0}ms)`);
        } catch (error) {
            console.error(`[slash] fail /${commandName} (${Date.now() - t0}ms) ${ctx}`, error);
            const payload = { content: "There was an error while executing this command!", flags: MessageFlags.Ephemeral };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(payload).catch((e) => console.error("[slash] followUp after fail failed", e));
            } else {
                await interaction.reply(payload).catch((e) => console.error("[slash] reply after fail failed", e));
            }
        }
    });

    await client.login(CONFIG.TOKEN);
}

void main();
