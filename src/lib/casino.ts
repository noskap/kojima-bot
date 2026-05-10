/** Lightweight casino helpers — chips use profiles.rouletteBalance (label as “chips”). */

export const SLOT_SYMBOLS = ["cherry", "lemon", "bell", "star", "diamond"] as const;
export type SlotSymbol = (typeof SLOT_SYMBOLS)[number];

export const SLOT_EMOJI: Record<SlotSymbol, string> = {
    cherry: "🍒",
    lemon: "🍋",
    bell: "🔔",
    star: "⭐",
    diamond: "💎",
};

const TRIPLE_MULT: Record<SlotSymbol, number> = {
    cherry: 5,
    lemon: 8,
    bell: 12,
    star: 22,
    diamond: 45,
};

export function pickSlotSymbol(): SlotSymbol {
    return SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]!;
}

export function spinSlots(): [SlotSymbol, SlotSymbol, SlotSymbol] {
    return [pickSlotSymbol(), pickSlotSymbol(), pickSlotSymbol()];
}

/** Credits won from the spin (after stake was removed). Triple match pays bet × multiplier into balance. */
export function slotsCreditsWon(reels: [SlotSymbol, SlotSymbol, SlotSymbol], bet: number): { credits: number; jackpot: boolean } {
    const [a, b, c] = reels;
    if (a === b && b === c) {
        const mult = TRIPLE_MULT[a];
        return { credits: bet * mult, jackpot: a === "diamond" };
    }
    return { credits: 0, jackpot: false };
}

/** European wheel 0–36; standard red set */
const RED_NUMS = new Set([
    1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export type WheelColor = "green" | "red" | "black";

export function spinRouletteNumber(): { n: number; color: WheelColor } {
    const n = Math.floor(Math.random() * 37);
    if (n === 0) return { n, color: "green" };
    return { n, color: RED_NUMS.has(n) ? "red" : "black" };
}

/** Credits to add back after stake was removed (full return on win). */
export function rouletteCreditsWon(bet: number, picked: WheelColor, result: WheelColor): number {
    if (picked !== result) return 0;
    if (result === "green") return bet * 15;
    return bet * 2;
}

export function flipCoin(): "heads" | "tails" {
    return Math.random() < 0.5 ? "heads" : "tails";
}
