import { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } from "discord.js";
import { Command } from "../index";
import { db } from "../db";
import { users } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { CONFIG } from "../config";
import { generateCatchImage } from "../utils/image-gen";

// Rarity configurations
const RARITIES = [
    { name: "Fine", chance: 1000, color: 0x6E593C },
    { name: "Nice", chance: 750, color: 0xCCCCCC },
    { name: "Good", chance: 500, color: 0x007F0E },
    { name: "Rare", chance: 350, color: 0xFFFF00 },
    { name: "Wild", chance: 275, color: 0x750F0E },
    { name: "Baby", chance: 230, color: 0xC12929 },
    { name: "Epic", chance: 200, color: 0xFF81C6 },
    { name: "Legendary", chance: 35, color: 0xFF0000 },
    { name: "Mythic", chance: 25, color: 0x8800FF },
];

function getRarity() {
    const totalWeight = RARITIES.reduce((acc, r) => acc + r.chance, 0);
    let random = Math.floor(Math.random() * totalWeight);
    for (const rarity of RARITIES) {
        if (random < rarity.chance) return rarity;
        random -= rarity.chance;
    }
    return RARITIES[0];
}

const command: Command = {
    data: new SlashCommandBuilder()
        .setName("catch")
        .setDescription(`Catch a wild ${CONFIG.ENTITY_NAME}!`),
    async execute(interaction) {
        await interaction.deferReply();

        const user = interaction.user;
        const guildId = interaction.guildId;

        // 1. Get or Create User
        let userProfile = await db.select().from(users).where(eq(users.id, user.id)).get();
        if (!userProfile) {
            userProfile = await db.insert(users).values({ id: user.id, username: user.username }).returning().get();
        }

        // 2. Cooldown Check (Simple 5 minutes for demo)
        // In a real port we'd check `lastCatchTime` from profiles, but kept simple here.
        // const cooldownTime = 5 * 60 * 1000;
        // ... (Skipping strict cooldown for demo to allow testing)

        // 3. Roll Rarity
        const rarity = getRarity();
        const entityName = CONFIG.ENTITY_NAME;

        // 4. Update DB
        // Increment total catches
        await db.update(users)
            .set({
                totalCatches: sql`${users.totalCatches} + 1`,
                // Ideally we'd update specific rarity counts too if we mapped them one-to-one
            })
            .where(eq(users.id, user.id))
            .run();

        // 5. Generate Image
        // We create a fake message object to pass to the image generator
        const fakeMessage: any = {
            cleanContent: `You caught a ${rarity.name} ${entityName}!`,
            content: `You caught a ${rarity.name} ${entityName}!`,
            author: user,
            member: interaction.member,
            guild: interaction.guild,
            createdTimestamp: Date.now()
        };

        // Simulating the "catch" quote
        // Random funny quotes could be added here
        const quotes = [
            `What a nice ${entityName}!`,
            `Look at this ${entityName}!`,
            `It's dangerous to go alone, take this ${entityName}.`,
            `A wild ${entityName} appeared!`
        ];
        const quote = quotes[Math.floor(Math.random() * quotes.length)];
        fakeMessage.cleanContent = quote; // Use quote for image text

        // We need to fetch the member object properly for the image gen if possible
        const target = interaction.member || interaction.user;
        const attachment = await generateCatchImage(fakeMessage, target as any);

        // 6. Send Reply
        const embed = new EmbedBuilder()
            .setTitle(`${rarity.name} ${entityName} Caught!`)
            .setDescription(`You caught a **${rarity.name} ${entityName}**!\n"${quote}"`)
            .setColor(rarity.color)
            .setImage("attachment://catch.png")
            .setFooter({ text: `Total catches: ${(userProfile?.totalCatches || 0) + 1}` });

        await interaction.editReply({ embeds: [embed], files: [attachment] });
    }
};

export default command;
