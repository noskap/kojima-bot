import { Message, PermissionFlagsBits } from "discord.js";
import { CONFIG } from "../config";

/** Loose URL match for typical chat URLs (Discord often wraps with <>) */
const URL_IN_TEXT = /https?:\/\/[^\s<>[\]()'"`]+/gi;

/** Strip trailing punctuation that often hugs URLs in sentences */
function trimUrlCandidate(raw: string): string {
    return raw.replace(/[),.;:!?*_~…]+$/u, "");
}

const linkFixupPermDeniedLogged = new Set<string>();

/** Call from `ClientReady` once so you know the feature loaded. */
export function logLinkFixupStartup(): void {
    if (!CONFIG.LINK_FIXUP_X && !CONFIG.LINK_FIXUP_INSTAGRAM) return;
    console.log(
        `[link-fixup] Enabled — LINK_FIXUP_X=${CONFIG.LINK_FIXUP_X}  LINK_FIXUP_INSTAGRAM=${CONFIG.LINK_FIXUP_INSTAGRAM}`,
    );
}

function hostnameKey(host: string): string {
    return host.replace(/^www\./i, "").toLowerCase();
}

/** Hosts that get swapped to fixupx.com; path + query stay the same so Discord embeds the mirror. */
function rewriteToFixupx(urlString: string): string | null {
    try {
        const u = new URL(urlString);
        const key = hostnameKey(u.hostname);
        if (key !== "x.com" && key !== "twitter.com" && key !== "mobile.twitter.com") return null;
        u.hostname = "fixupx.com";
        return u.toString();
    } catch {
        return null;
    }
}

function isInstagramHostname(host: string): boolean {
    const k = hostnameKey(host);
    return k === "instagram.com" || k === "m.instagram.com";
}

/** instagram.com → vxinstagram.com; strips `?query` (tracking / share params). */
function rewriteToVxInstagram(urlString: string): string | null {
    try {
        const u = new URL(urlString);
        if (!isInstagramHostname(u.hostname)) return null;
        u.hostname = "vxinstagram.com";
        u.search = "";
        return u.toString();
    } catch {
        return null;
    }
}

function rewriteEmbedUrl(raw: string): string | null {
    if (CONFIG.LINK_FIXUP_INSTAGRAM) {
        const ig = rewriteToVxInstagram(raw);
        if (ig) return ig;
    }
    if (CONFIG.LINK_FIXUP_X) {
        return rewriteToFixupx(raw);
    }
    return null;
}

/**
 * If the message is only text (no attachments/stickers) and contains fixable URLs (X/Twitter, Instagram),
 * delete it and repost with mirror hosts so Discord embeds improve.
 *
 * Needs **Manage Messages** + **Send Messages** in the channel.
 */
export async function maybeFixupEmbeddedLinks(message: Message): Promise<void> {
    if (!CONFIG.LINK_FIXUP_X && !CONFIG.LINK_FIXUP_INSTAGRAM) return;
    if (message.author.bot) return;
    if (!message.guild || !message.guildId) return;
    if (!message.content.trim()) return;
    if (message.attachments.size > 0 || message.stickers.size > 0) return;

    const hits = [...message.content.matchAll(URL_IN_TEXT)].map((m) => m[0]!);
    if (!hits.length) return;

    let next = message.content;
    let touched = false;
    for (const raw of hits) {
        const candidate = trimUrlCandidate(raw);
        const rep = rewriteEmbedUrl(candidate);
        if (rep && rep !== candidate) {
            next = next.split(raw).join(rep);
            touched = true;
        }
    }
    if (!touched || next === message.content) return;

    if (!message.channel?.isTextBased() || message.channel.isDMBased()) return;

    const me =
        message.guild.members.me ??
        (await message.guild.members.fetch(message.client.user.id).catch(() => null));
    if (!me) {
        console.warn("[link-fixup] bot guild member not found — cannot check channel permissions");
        return;
    }

    const need = PermissionFlagsBits.ManageMessages | PermissionFlagsBits.SendMessages;
    if (!me.permissionsIn(message.channel).has(need)) {
        const chId = message.channel.id;
        if (!linkFixupPermDeniedLogged.has(chId)) {
            linkFixupPermDeniedLogged.add(chId);
            console.warn(
                `[link-fixup] skipping ${chId}: bot needs Manage Messages + Send Messages (role overrides in this channel/thread).`,
            );
        }
        return;
    }

    try {
        await message.delete();
    } catch (e) {
        console.warn("[link-fixup] could not delete message (permissions or Discord error) — paste still shows x.com:", e);
        return;
    }

    const authorLabel = message.member?.displayName ?? message.author.username;
    await message.channel.send({
        content: `**${authorLabel}** shared:\n${next}`,
        allowedMentions: { parse: [], users: [], roles: [] },
    });
}
