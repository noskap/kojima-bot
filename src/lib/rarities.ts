import path from "path";
import { existsSync } from "fs";
import { profiles } from "../db/schema";

export type RarityDef = {
    display: string;
    /** filename prefix under assets/images/spawn: `{fileKey}_cat.png` */
    fileKey: string;
    weight: number;
    color: number;
};

/** Ordered roughly common → rare (weights). Matches existing spawn art files. */
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

type ProfileRow = typeof profiles.$inferSelect;

const DISPLAY_TO_COUNT: Record<string, keyof ProfileRow> = {
    Fine: "countFine",
    Nice: "countNice",
    Good: "countGood",
    Rare: "countRare",
    Wild: "countWild",
    Baby: "countBaby",
    Epic: "countEpic",
    Sus: "countSus",
    Brave: "countBrave",
    Rickroll: "countRickroll",
    Reverse: "countReverse",
    Superior: "countSuperior",
    Trash: "countTrash",
    Legendary: "countLegendary",
    Mythic: "countMythic",
    "8bit": "count8bit",
    Corrupt: "countCorrupt",
    Professor: "countProfessor",
    Divine: "countDivine",
    Real: "countReal",
    Ultimate: "countUltimate",
    eGirl: "countEgirl",
};

export function rollRarity(): RarityDef {
    const total = RARITIES.reduce((s, r) => s + r.weight, 0);
    let n = Math.random() * total;
    for (const r of RARITIES) {
        n -= r.weight;
        if (n <= 0) return r;
    }
    return RARITIES[0];
}

export function resolveSpawnImagePath(fileKey: string): string {
    const root = process.cwd();
    const primary = path.join(root, "assets/images/spawn", `${fileKey}.jpg`);
    if (existsSync(primary)) return primary;
    const fine = path.join(root, "assets/images/spawn", "fine_cat.png");
    if (existsSync(fine)) return fine;
    return path.join(root, "assets/images/cat.png");
}

/** Trash tier sometimes uses the containment art for variety */
export function spawnImagePathForRarity(r: RarityDef): string {
    if (r.display === "Trash" && Math.random() < 0.35) {
        const alt = path.join(process.cwd(), "assets/images/spawn/thetrashcell_cat.png");
        if (existsSync(alt)) return alt;
    }
    return resolveSpawnImagePath(r.fileKey);
}

export function profileCountKey(display: string): keyof ProfileRow | undefined {
    return DISPLAY_TO_COUNT[display];
}
