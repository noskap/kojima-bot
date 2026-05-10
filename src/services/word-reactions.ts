import { Client, Message, PermissionFlagsBits } from "discord.js";

/**
 * Keyword → application emoji **name** (Discord Developer Portal → App → Emoji).
 * Same behavior as legacy cat-bot `reactions`: case-insensitive substring match on message text.
 */
const WORD_EMOJI_TRIGGERS: readonly { keyword: string; emojiName: string }[] = [
    { keyword: "invisible", emojiName: "invisible" },
    { keyword: "haha", emojiName: "happyboss" },
    { keyword: "dud", emojiName: "dud" },
];

/** Mirrors legacy global reset from `maintaince_loop` (~5min). */
const REACTION_GUILD_LIMIT = 100;
const RATELIMIT_RESET_MS = 300_000;

const guildReactionTotals = new Map<string, number>();

setInterval(() => {
    guildReactionTotals.clear();
}, RATELIMIT_RESET_MS);

export async function primeWordReactionEmojis(client: Client): Promise<void> {
    const app = client.application;
    if (!app) return;
    await app.emojis.fetch().catch((e) => console.warn("[word-reactions] failed to fetch application emojis:", e));
}

export async function handleWordReactions(client: Client, message: Message): Promise<void> {
    if (!message.guild || message.author.bot || message.webhookId) return;
    const text = message.content.toLowerCase();
    if (!text) return;

    const me = message.guild.members.me;
    if (!me) return;

    if (!message.channel.isTextBased() || message.channel.isDMBased()) return;
    const perms = message.channel.permissionsFor(me);
    if (!perms?.has(PermissionFlagsBits.AddReactions)) return;

    const app = client.application;
    if (!app) return;

    const guildId = message.guild.id;

    for (const { keyword, emojiName } of WORD_EMOJI_TRIGGERS) {
        if (!text.includes(keyword)) continue;
        if ((guildReactionTotals.get(guildId) ?? 0) >= REACTION_GUILD_LIMIT) return;

        const emoji = app.emojis.cache.find((e) => e.name === emojiName);
        if (!emoji) continue;

        try {
            await message.react(emoji);
            guildReactionTotals.set(guildId, (guildReactionTotals.get(guildId) ?? 0) + 1);
        } catch {
            /* missing permissions / unknown emoji at API level */
        }
    }
}
