import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { eq } from "drizzle-orm";
import type { Command } from "../index";
import { db } from "../db";
import { profiles } from "../db/schema";
import { getOrCreateProfile } from "../lib/game-db";
import {
    flipCoin,
    rouletteCreditsWon,
    SLOT_EMOJI,
    spinRouletteNumber,
    spinSlots,
    slotsCreditsWon,
    type WheelColor,
} from "../lib/casino";
import { processGambleAchievements } from "../lib/achievements";

const MAX_BET = 500_000;

function achLines(unlocked: { title: string }[]): string {
    if (!unlocked.length) return "";
    return "\n\n🏆 **Achievement:** " + unlocked.map((a) => `*${a.title}*`).join(", ");
}

const command: Command = {
    data: new SlashCommandBuilder()
        .setName("gamble")
        .setDescription("Casino minigames (chips are fake — not real money)")
        .addSubcommand((sc) => sc.setName("balance").setDescription("Check your chip balance"))
        .addSubcommand((sc) =>
            sc
                .setName("slots")
                .setDescription("Triple-match slots")
                .addIntegerOption((o) =>
                    o.setName("bet").setDescription("Chips to wager").setRequired(true).setMinValue(1).setMaxValue(MAX_BET),
                ),
        )
        .addSubcommand((sc) =>
            sc
                .setName("flip")
                .setDescription("Double-or-nothing coin flip")
                .addIntegerOption((o) =>
                    o.setName("bet").setDescription("Chips to wager").setRequired(true).setMinValue(1).setMaxValue(MAX_BET),
                )
                .addStringOption((o) =>
                    o
                        .setName("call")
                        .setDescription("Your call")
                        .setRequired(true)
                        .addChoices(
                            { name: "Heads", value: "heads" },
                            { name: "Tails", value: "tails" },
                        ),
                ),
        )
        .addSubcommand((sc) =>
            sc
                .setName("roulette")
                .setDescription("European-style color bet (0 is green)")
                .addIntegerOption((o) =>
                    o.setName("bet").setDescription("Chips to wager").setRequired(true).setMinValue(1).setMaxValue(MAX_BET),
                )
                .addStringOption((o) =>
                    o
                        .setName("color")
                        .setDescription("Bet on a color")
                        .setRequired(true)
                        .addChoices(
                            { name: "Red", value: "red" },
                            { name: "Black", value: "black" },
                            { name: "Green (0)", value: "green" },
                        ),
                ),
        ),
    async execute(interaction) {
        if (!interaction.guildId) {
            await interaction.reply({ content: "Use this in a server.", ephemeral: true });
            return;
        }

        const userId = interaction.user.id;
        const guildId = interaction.guildId;
        let profile = await getOrCreateProfile(userId, guildId);
        const sub = interaction.options.getSubcommand();

        if (sub === "balance") {
            const bal = profile.rouletteBalance ?? 0;
            await interaction.reply({
                ephemeral: true,
                embeds: [
                    new EmbedBuilder()
                        .setTitle("Casino chips")
                        .setDescription(`You have **${bal.toLocaleString()}** chips.\n\nEarn more by catching spawns… good luck.`)
                        .setColor(0x5865f2),
                ],
            });
            return;
        }

        const bet = interaction.options.getInteger("bet", true);
        const balance = profile.rouletteBalance ?? 0;
        if (bet > balance) {
            await interaction.reply({
                content: `You only have **${balance.toLocaleString()}** chips. Try \`/gamble balance\`.`,
                ephemeral: true,
            });
            return;
        }

        if (sub === "slots") {
            const reels = spinSlots();
            const { credits, jackpot } = slotsCreditsWon(reels, bet);
            const display = reels.map((s) => SLOT_EMOJI[s]).join(" ");

            await db
                .update(profiles)
                .set({
                    rouletteBalance: balance - bet + credits,
                    gambles: (profile.gambles ?? 0) + 1,
                    slotSpins: (profile.slotSpins ?? 0) + 1,
                    slotWins: (profile.slotWins ?? 0) + (credits > 0 ? 1 : 0),
                    slotBigWins: (profile.slotBigWins ?? 0) + (jackpot ? 1 : 0),
                } as never)
                .where(eq(profiles.id, profile.id))
                .run();

            const fresh = (await db.select().from(profiles).where(eq(profiles.id, profile.id)).get())!;
            const unlocked = await processGambleAchievements(userId, guildId, fresh, { slotsJackpot: jackpot });

            const net = credits - bet;
            const embed = new EmbedBuilder()
                .setTitle("🎰 Slots")
                .setDescription(
                    `**${display}**\n\n` +
                        (credits > 0
                            ? `You won **${credits.toLocaleString()}** chips (net **${net >= 0 ? "+" : ""}${net.toLocaleString()}**).`
                            : `No match — **-${bet.toLocaleString()}** chips.`) +
                        achLines(unlocked),
                )
                .setColor(jackpot ? 0xffd700 : credits > 0 ? 0x57f287 : 0xed4245)
                .setFooter({ text: `Balance: ${(fresh.rouletteBalance ?? 0).toLocaleString()} chips` });

            await interaction.reply({ embeds: [embed] });
            return;
        }

        if (sub === "flip") {
            const call = interaction.options.getString("call", true) as "heads" | "tails";
            const landed = flipCoin();
            const win = call === landed;

            const newBal = win ? balance - bet + bet * 2 : balance - bet;

            await db
                .update(profiles)
                .set({
                    rouletteBalance: newBal,
                    gambles: (profile.gambles ?? 0) + 1,
                    flipPlays: (profile.flipPlays ?? 0) + 1,
                } as never)
                .where(eq(profiles.id, profile.id))
                .run();

            const fresh = (await db.select().from(profiles).where(eq(profiles.id, profile.id)).get())!;
            const unlocked = await processGambleAchievements(userId, guildId, fresh, {});

            const embed = new EmbedBuilder()
                .setTitle("🪙 Coin flip")
                .setDescription(
                    `You called **${call}**. It landed **${landed}**.\n\n` +
                        (win
                            ? `**Win!** +${bet.toLocaleString()} chips profit.`
                            : `**Loss.** −${bet.toLocaleString()} chips.`) +
                        achLines(unlocked),
                )
                .setColor(win ? 0x57f287 : 0xed4245)
                .setFooter({ text: `Balance: ${(fresh.rouletteBalance ?? 0).toLocaleString()} chips` });

            await interaction.reply({ embeds: [embed] });
            return;
        }

        if (sub === "roulette") {
            const pick = interaction.options.getString("color", true) as WheelColor;
            const { n, color: landed } = spinRouletteNumber();
            const credits = rouletteCreditsWon(bet, pick, landed);
            const win = credits > 0;

            await db
                .update(profiles)
                .set({
                    rouletteBalance: balance - bet + credits,
                    gambles: (profile.gambles ?? 0) + 1,
                    rouletteSpins: (profile.rouletteSpins ?? 0) + 1,
                    rouletteWins: (profile.rouletteWins ?? 0) + (win ? 1 : 0),
                } as never)
                .where(eq(profiles.id, profile.id))
                .run();

            const fresh = (await db.select().from(profiles).where(eq(profiles.id, profile.id)).get())!;
            const unlocked = await processGambleAchievements(userId, guildId, fresh, {});

            const colorEmoji = landed === "green" ? "🟢" : landed === "red" ? "🔴" : "⚫";
            const embed = new EmbedBuilder()
                .setTitle("🎡 Roulette")
                .setDescription(
                    `Ball landed on **${n}** ${colorEmoji} **${landed}**.\nYou bet **${pick}**.\n\n` +
                        (win
                            ? `**Win!** Returned **${credits.toLocaleString()}** chips.`
                            : `**Loss.** −${bet.toLocaleString()} chips.`) +
                        achLines(unlocked),
                )
                .setColor(win ? 0x57f287 : 0xed4245)
                .setFooter({ text: `Balance: ${(fresh.rouletteBalance ?? 0).toLocaleString()} chips` });

            await interaction.reply({ embeds: [embed] });
        }
    },
};

export default command;
