import { GlobalFonts, createCanvas, loadImage } from "@napi-rs/canvas";
import { AttachmentBuilder, Message, GuildMember, User } from "discord.js";
import { ASSETS, CONFIG } from "../config";
import path from "path";

// Register fonts
// Note: We resolve paths relative to process.cwd()
GlobalFonts.registerFromPath(path.resolve(ASSETS.FONTS.MAIN), "Whitney");
GlobalFonts.registerFromPath(path.resolve(ASSETS.FONTS.SECONDARY), "GGSans");

// Helper to draw rounded rectangle
function roundedRect(ctx: any, x: number, y: number, width: number, height: number, radius: number) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
}

/**
 * Generates an image mimicking a Discord message.
 */
export async function generateCatchImage(message: Message, targetUser: GuildMember | User): Promise<AttachmentBuilder> {
    const text = message.cleanContent || message.content || " ";
    const nickname = targetUser instanceof GuildMember ? targetUser.displayName : targetUser.username;
    const color = targetUser instanceof GuildMember && targetUser.displayColor !== 0
        ? `#${targetUser.displayColor.toString(16).padStart(6, '0')}`
        : "#FFFFFF";

    // Setup Canvas
    // Logic adapted from msg2img.py (width 1000ish)
    // We'll simplify the dynamic height calculation for now
    const dummyCanvas = createCanvas(1000, 500);
    const ctx = dummyCanvas.getContext("2d");

    ctx.font = "32px GGSans";
    // Simple text wrapping (this is a basic implementation, msg2img was more complex)
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = words[0];
    const maxWidth = 900;

    for (let i = 1; i < words.length; i++) {
        const width = ctx.measureText(currentLine + " " + words[i]).width;
        if (width < maxWidth) {
            currentLine += " " + words[i];
        } else {
            lines.push(currentLine);
            currentLine = words[i];
        }
    }
    lines.push(currentLine);

    // Calculate height
    const lineHeight = 36;
    const infoHeight = 70;
    const totalHeight = infoHeight + (lines.length * lineHeight) + 20;

    // Create real canvas
    const canvas = createCanvas(1067, Math.max(150, totalHeight));
    const context = canvas.getContext("2d");

    // Background
    context.fillStyle = "#313338"; // Dark theme bg
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Avatar
    try {
        const avatarUrl = targetUser.displayAvatarURL({ extension: 'png', size: 128 });
        const avatar = await loadImage(avatarUrl);

        // Circular mask
        context.save();
        context.beginPath();
        context.arc(52, 52, 40, 0, Math.PI * 2, true);
        context.closePath();
        context.clip();
        context.drawImage(avatar, 12, 12, 80, 80);
        context.restore();
    } catch (e) {
        console.error("Failed to load avatar", e);
        // Fallback or leave blank
    }

    // Name
    context.font = "32px Whitney";
    context.fillStyle = color;
    context.fillText(nickname, 122, 40);

    // Timestamp (simple)
    context.font = "23px Whitney";
    context.fillStyle = "#A3A4AA";
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const nameWidth = context.measureText(nickname).width;
    context.fillText(`Today at ${timeStr}`, 122 + nameWidth + 10, 40);

    // Content
    context.font = "32px GGSans";
    context.fillStyle = "#FFFFFF";
    lines.forEach((line, index) => {
        context.fillText(line, 122, 80 + (index * lineHeight));
    });

    const buffer = await canvas.encode("png");
    return new AttachmentBuilder(buffer, { name: 'catch.png' });
}
