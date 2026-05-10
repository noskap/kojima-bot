import { messages as RAW_QUOTES } from "../../colonel/src/data/messages.ts";

/** Celebration lines from colonel-gw; {{entity}} is replaced when present */

const SILLY_EXTRAS = [
    "Anyway, water your plants.",
//     "Side quest complete. Back to reality.",
    "Remember to water your plants.",
    "Consider touching plants between catches.",
    "This message will self-destruct in… never. Water your plants.",
    "Stay hydrated. Just kidding, water your plants."
];

/** One random colonel message; `{{entity}}` placeholders use `entity` when present. */
export function randomColonelQuote(entity?: string): string {
    const raw = RAW_QUOTES[Math.floor(Math.random() * RAW_QUOTES.length)]!;
    const e = entity ?? "Snake";
    return raw.replace(/\{\{entity\}\}/g, e);
}

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
