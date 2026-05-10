import type { ChatInputCommandInteraction } from "discord.js";
import { Client, MessageFlags, PermissionFlagsBits } from "discord.js";
import { CONFIG } from "../config";
import { rarityFromTypeOption } from "./rarities";
import { forceSpawnNow } from "../services/gameplay";

/** Shared by `/forcespawn` and `/kojima forcespawn`. */
export async function executeForceSpawnSlash(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guildId || !interaction.guild) {
        await interaction.reply({ content: "Use this in a server.", flags: MessageFlags.Ephemeral });
        return;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
        await interaction.reply({
            content: "You need **Manage Channels** for that.",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const typePick = interaction.options.getString("type");
    const forced = rarityFromTypeOption(typePick);
    if (typePick && typePick.trim() !== "" && !forced) {
        await interaction.reply({
            content: "That type isn’t in the rarity list. Pick from the dropdown or use the exact label (try `Rare` / `rare`).",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const res = await forceSpawnNow(interaction.client as Client, interaction.guildId, interaction.channelId, forced);
    if (!res.ok) {
        await interaction.editReply(res.reason);
        return;
    }
    await interaction.editReply(
        forced
            ? `Spawned **${forced.display}** ${CONFIG.ENTITY_NAME}.`
            : `Posted a random **${CONFIG.ENTITY_NAME}** spawn.`,
    );
}
