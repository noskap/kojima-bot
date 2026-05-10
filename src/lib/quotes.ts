import { messages as RAW_QUOTES } from "../../colonel/src/data/messages.ts";

/** Celebration lines from colonel-gw; {{entity}} is replaced when present */

const SILLY_EXTRAS = [
    "Anyway, water your plants.",
    "Side quest complete. Back to reality.",
    "Remember to stretch your wrists.",
    "Consider touching grass between catches.",
    "This message will self-destruct in… never. Discord logs exist.",
];

export function randomCelebrationQuote(entity: string): string {
    const base = RAW_QUOTES[Math.floor(Math.random() * RAW_QUOTES.length)]!.replace(
        /\{\{entity\}\}/g,
        entity,
    );
    if (Math.random() < 0.4) {
        const extra = SILLY_EXTRAS[Math.floor(Math.random() * SILLY_EXTRAS.length)]!;
        return `${base}\n\n_${extra}_`;
    }
    return base;
}
