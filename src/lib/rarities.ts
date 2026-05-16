import path from "path";
import { existsSync } from "fs";
import { profiles } from "../db/schema";

export type RarityDef = {
    display: string;
    /** Spawn image: `assets/images/spawn/${fileKey}.` + `.jpg` | `.png` | … */
    fileKey: string;
    weight: number;
    color: number;
};

type ProfileRow = typeof profiles.$inferSelect;

/**
 * Profile DB columns mapped 1:1 with `RARITIES` row order (`RARITIES[i]` ↔ `PROFILE_COUNT_SLOTS[i]`).
 * If you reorder or resize `RARITIES`, keep these lists the same length.
 */
export const PROFILE_COUNT_SLOTS = [
    "countFine",
    "countNice",
    "countGood",
    "countRare",
    "countWild",
    "countBaby",
    "countEpic",
    "countSus",
    "countBrave",
    "countRickroll",
    "countReverse",
    "countSuperior",
    "countTrash",
    "countLegendary",
    "countMythic",
    "count8bit",
    "countCorrupt",
    "countProfessor",
    "countDivine",
    "countReal",
    "countUltimate",
    "countEgirl",
] as const satisfies ReadonlyArray<keyof ProfileRow>;

/** Ordered roughly common → rare (weights). Matches spawn art filenames (`fileKey`). */
export const RARITIES: RarityDef[] = [
    { display: "Stylish", fileKey: "stylish", weight: 900, color: 0x6e593c },
    { display: "Sick", fileKey: "sick", weight: 700, color: 0xcccccc },
    { display: "Matrix", fileKey: "matrix", weight: 550, color: 0x007f0e },
    { display: "Super", fileKey: "super", weight: 400, color: 0xffff00 },
    { display: "Drunk", fileKey: "drunk", weight: 320, color: 0x750f0e },
    { display: "Banana", fileKey: "banana", weight: 260, color: 0xc12929 },
    { display: "Chicken Hat", fileKey: "chicken_hat", weight: 220, color: 0x555555 },
    { display: "Disguised", fileKey: "disguised", weight: 200, color: 0xff8c00 },
    { display: "Crowbar", fileKey: "crowbar", weight: 180, color: 0xff0000 },
    { display: "Exercise", fileKey: "exercise", weight: 150, color: 0xff69b4 },
    { display: "Valve", fileKey: "valve", weight: 140, color: 0x9400d3 },
    { display: "Combat", fileKey: "combat", weight: 130, color: 0x00ced1 },
    { display: "Mocap", fileKey: "mocap", weight: 110, color: 0xc0c0c0 },
    { display: "Broken", fileKey: "broken", weight: 95, color: 0x2f4f4f },
    { display: "Rare", fileKey: "rare", weight: 85, color: 0xff81c6 },
    { display: "Russian", fileKey: "russian", weight: 75, color: 0x8b4513 },
    { display: "Porter", fileKey: "porter", weight: 45, color: 0xff0000 },
    { display: "Alien", fileKey: "alien", weight: 40, color: 0x228b22 },
    { display: "Sushi", fileKey: "sushi", weight: 30, color: 0xffd700 },
    { display: "Mexican", fileKey: "mexican", weight: 25, color: 0x9400d3 },
    { display: "Burger", fileKey: "burger", weight: 18, color: 0x8800ff },
    { display: "Weed", fileKey: "weed", weight: 12, color: 0xffc0cb },
];

if (RARITIES.length !== PROFILE_COUNT_SLOTS.length) {
    throw new Error(
        `rarities.ts: RARITIES.length (${RARITIES.length}) must equal PROFILE_COUNT_SLOTS.length (${PROFILE_COUNT_SLOTS.length}).`,
    );
}

/** Maps each spawn `display` string → profiles count column key. */
export const DISPLAY_TO_COUNT: Record<string, keyof ProfileRow> = Object.fromEntries(
    RARITIES.map((r, i) => [r.display, PROFILE_COUNT_SLOTS[i]!]),
) as Record<string, keyof ProfileRow>;

export function raritySlotDisplay(slot: keyof ProfileRow): string | undefined {
    const idx = PROFILE_COUNT_SLOTS.indexOf(slot as (typeof PROFILE_COUNT_SLOTS)[number]);
    return idx >= 0 ? RARITIES[idx]!.display : undefined;
}

/** Resolve `/forcespawn type:` or `/kojima forcespawn type:` → rarity (exact, case-insensitive display, or fileKey). */
export function rarityFromTypeOption(raw: string | null | undefined): RarityDef | undefined {
    if (raw == null) return undefined;
    const p = raw.trim();
    if (p === "") return undefined;

    let r = RARITIES.find((x) => x.display === p);
    if (r) return r;

    const lowDisplay = p.toLowerCase().replace(/\s+/g, " ");
    r = RARITIES.find((x) => x.display.toLowerCase() === lowDisplay);
    if (r) return r;

    const asFileKey = lowDisplay.replace(/ /g, "_");
    return RARITIES.find((x) => x.fileKey.toLowerCase() === asFileKey);
}

export function rollRarity(): RarityDef {
    const total = RARITIES.reduce((s, r) => s + r.weight, 0);
    let n = Math.random() * total;
    for (const r of RARITIES) {
        n -= r.weight;
        if (n <= 0) return r;
    }
    return RARITIES[0];
}

const SPAWN_IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp"] as const;
const SPAWN_IMAGE_DIR = path.join(process.cwd(), "assets/images/spawn");

/** Basename stems to try for a rarity `fileKey` (exact name first, then legacy `*_cat`). */
function spawnImageStems(fileKey: string): string[] {
    return fileKey.endsWith("_cat") ? [fileKey] : [fileKey, `${fileKey}_cat`];
}

function spawnAssetPathIfExists(fileKey: string): string | undefined {
    for (const stem of spawnImageStems(fileKey)) {
        for (const ext of SPAWN_IMAGE_EXTS) {
            const p = path.join(SPAWN_IMAGE_DIR, `${stem}${ext}`);
            if (existsSync(p)) return p;
        }
    }
    return undefined;
}

export function resolveSpawnImagePath(fileKey: string): string | undefined {
    return spawnAssetPathIfExists(fileKey);
}

/** Spawn embed art for a rolled rarity; falls back only when the asset file is missing. */
export function spawnImagePathForRarity(r: RarityDef): string {
    const resolved =
        resolveSpawnImagePath(r.fileKey) ??
        (RARITIES[0] ? resolveSpawnImagePath(RARITIES[0].fileKey) : undefined);
    if (resolved) return resolved;
    return path.join(process.cwd(), "assets/images/cat.png");
}

export function profileCountKey(display: string): keyof ProfileRow | undefined {
    return DISPLAY_TO_COUNT[display];
}

export function isSusSlot(display: string): boolean {
    return profileCountKey(display) === "countSus";
}

export function isMythicSlot(display: string): boolean {
    return profileCountKey(display) === "countMythic";
}

export function isShinySlot(display: string): boolean {
    const k = profileCountKey(display);
    return k === "countLegendary" || k === "countDivine" || k === "countUltimate";
}
