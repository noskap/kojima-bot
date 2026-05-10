/** Celebration lines; {{entity}} is replaced with ENTITY_NAME from config */
const RAW_QUOTES = [
    "Certified {{entity}} moment.",
    "This {{entity}} goes hard. Respect.",
    "The timeline needed this {{entity}}.",
    "Skill issue for everyone else. Not you. You have {{entity}}.",
    "Local {{entity}} obtained. The prophecy continues.",
    "That was fast. Almost suspiciously fast. Almost… {{entity}}.",
    "Science cannot explain this {{entity}}.",
    "They said it couldn't be done. They were wrong. {{entity}}.",
    "You wouldn't download a {{entity}}. Oh wait, you just did.",
    "Achievement unlocked: touched grass… then caught {{entity}}.",
    "{{entity}} acquisition protocol: success.",
    "The council has awarded you one (1) shiny {{entity}}.",
    "Photographic evidence incoming. This {{entity}} is real.",
    "That wasn't luck. That was raw {{entity}} energy.",
    "Hideo would be proud. Probably. Maybe. {{entity}}.",
    "You clicked/typed so fast the universe blinked. {{entity}} secured.",
    "Another {{entity}} for the pile. The pile grows stronger.",
    "Do not eat the {{entity}}. (Unless the rules say you can.)",
    "If you tell anyone about this {{entity}}, they'll believe you.",
];

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
