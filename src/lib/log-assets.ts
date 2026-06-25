import { existsSync, readdirSync } from "fs";
import { APP_ROOT, assetPath } from "./app-root";

function countFilesInDir(dir: string): number {
    if (!existsSync(dir)) return 0;
    try {
        return readdirSync(dir).filter((n) => !n.startsWith(".")).length;
    } catch {
        return 0;
    }
}

/** Log resolved asset paths once at startup (helps debug Docker / cwd issues). */
export function logAssetPaths(): void {
    const spawnDir = assetPath("images", "spawn");
    const memeDir = assetPath("images", "meme");
    const catPng = assetPath("images", "cat.png");
    const spawnN = countFilesInDir(spawnDir);
    const memeN = countFilesInDir(memeDir);
    console.log(
        `[assets] APP_ROOT=${APP_ROOT}  spawn=${spawnN} (${spawnDir})  meme=${memeN}  cat.png=${existsSync(catPng) ? "yes" : "MISSING"}`,
    );
    if (spawnN === 0 || !existsSync(catPng)) {
        console.warn(
            "[assets] Spawn images or cat.png missing — rebuild the image after `git pull` and verify assets/ on the build host.",
        );
    }
}
