import fs from "fs";
import path from "path";
import { readFileSync } from "fs";
import {
    SlashCommandBuilder,
    AttachmentBuilder,
    MessageFlags,
    type ChatInputCommandInteraction,
    type Collection,
} from "discord.js";

type LoadedSlashCommand = {
    data: SlashCommandBuilder;
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
};

export const MEME_DIR = path.resolve(process.cwd(), "assets/images/meme");

/** Files Discord accepts well as attachment uploads (GIF/image or video). */
const MEME_ATTACHMENT_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".webm"]);

/** Discord guild application-command ceiling (hard cap ~500 — keep buffer for core cmds) */
export const MEME_GUILD_COMMAND_CAP = 500;

function walkFilesRecursive(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    const out: string[] = [];
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.name.startsWith(".")) continue;
        if (ent.isDirectory()) out.push(...walkFilesRecursive(p));
        else out.push(p);
    }
    return out;
}

/** Discord slash names: lowercase a-z, 0–9, _ ; 1–32 chars */
export function memeFileToCommandNameStem(fileBasenameSansExt: string): string {
    let s = fileBasenameSansExt.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_");
    if (s.length > 32) s = s.slice(0, 32);
    s = s.replace(/^_|_$/g, "");
    return s.length > 0 ? s : "meme";
}

export type MemeEntry = {
    absolutePath: string;
    label: string;
    commandName: string;
};

function uniqueCommandNames(entries: { stem: string; absolutePath: string; label: string }[]): MemeEntry[] {
    const used = new Set<string>();
    const out: MemeEntry[] = [];
    for (const e of entries) {
        let name = memeFileToCommandNameStem(e.stem);
        let n = 2;
        while (used.has(name)) {
            name = memeFileToCommandNameStem(`${e.stem}_${n}`);
            n++;
        }
        used.add(name);
        out.push({
            absolutePath: e.absolutePath,
            label: e.label.replace(/\\/g, "/"),
            commandName: name,
        });
    }
    return out.sort((a, b) => a.commandName.localeCompare(b.commandName));
}

export function scanMemeImageFiles(): MemeEntry[] {
    const paths = walkFilesRecursive(MEME_DIR).filter((p) =>
        MEME_ATTACHMENT_EXTS.has(path.extname(p).toLowerCase()),
    );
    const raw = paths.map((absolutePath) => ({
        stem: path.basename(absolutePath, path.extname(absolutePath)),
        absolutePath,
        label: path.relative(MEME_DIR, absolutePath),
    }));
    return uniqueCommandNames(raw);
}

function memeDescription(label: string): string {
    const prefix = "Meme: ";
    const max = 100 - prefix.length;
    const shortened = label.length <= max ? label : `${label.slice(0, Math.max(0, max - 1))}…`;
    return `${prefix}${shortened}`;
}

/** Bodies appended after core commands — does not mutate the input set */
export function buildMemeSlashBodies(reservedSlashNames: ReadonlySet<string>, maxAdditional: number): unknown[] {
    const bodies: unknown[] = [];
    const taken = new Set(reservedSlashNames);
    if (maxAdditional <= 0) return bodies;

    for (const m of scanMemeImageFiles()) {
        if (bodies.length >= maxAdditional) break;
        if (taken.has(m.commandName)) continue;
        taken.add(m.commandName);
        bodies.push(new SlashCommandBuilder().setName(m.commandName).setDescription(memeDescription(m.label)).toJSON());
    }

    const totalMeme = scanMemeImageFiles().length;
    if (bodies.length < totalMeme && bodies.length >= maxAdditional) {
        console.warn(
            `[meme] Registered ${bodies.length} meme slash commands this run (hit slot limit or name collision with core commands).`,
        );
    }
    return bodies;
}

export async function executeMemeSlash(interaction: ChatInputCommandInteraction, filePath: string): Promise<void> {
    if (!interaction.guildId) {
        await interaction.reply({ content: "Use memes in a server.", flags: MessageFlags.Ephemeral });
        return;
    }

    await interaction.deferReply();
    try {
        const buf = readFileSync(filePath);
        const name = path.basename(filePath);
        const att = new AttachmentBuilder(buf, { name });
        await interaction.editReply({ files: [att] });
    } catch {
        await interaction.editReply({ content: "Could not load that meme file.", flags: MessageFlags.Ephemeral }).catch(() => {});
    }
}

/** Run after loading `commands/*.ts` handlers so names don’t collide. */
export function registerMemeSlashHandlers(registry: Collection<string, LoadedSlashCommand>): number {
    let added = 0;
    const availableSlots = MEME_GUILD_COMMAND_CAP - registry.size;

    if (availableSlots <= 0) {
        console.warn("[meme] At guild slash cap before memes — remove commands or meme files.");
        return 0;
    }

    for (const m of scanMemeImageFiles()) {
        if (added >= availableSlots) {
            console.warn(`[meme] Stopped at guild cap (${MEME_GUILD_COMMAND_CAP} commands). Extra files ignored.`);
            break;
        }
        if (registry.has(m.commandName)) {
            console.warn(`[meme] Skip "${m.label}" → /${m.commandName} (same name as a core command)`);
            continue;
        }

        const data = new SlashCommandBuilder().setName(m.commandName).setDescription(memeDescription(m.label));

        registry.set(m.commandName, {
            data,
            execute: async (interaction) => executeMemeSlash(interaction, m.absolutePath),
        });
        added++;
    }

    if (added) console.log(`Meme slash handlers: ${added} (assets/images/meme)`);
    else if (!fs.existsSync(MEME_DIR) || scanMemeImageFiles().length === 0)
        console.log("No meme images — create assets/images/meme/");
    return added;
}
