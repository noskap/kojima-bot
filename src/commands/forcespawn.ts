import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../index";
import { RARITIES } from "../lib/rarities";
import { executeForceSpawnSlash } from "../lib/force-spawn-slash";

const command: Command = {
    data: new SlashCommandBuilder()
        .setName("forcespawn")
        .setDescription("Post a spawn now (same as /kojima forcespawn)")
        .addStringOption((o) => {
            const opt = o
                .setName("type")
                .setDescription("Spawn this type, or random if omitted")
                .setRequired(false);
            return opt.addChoices(...RARITIES.slice(0, 25).map((r) => ({ name: r.display, value: r.display })));
        }),
    execute: executeForceSpawnSlash,
};

export default command;
