import path from "path";

/** Absolute repo root (`src/`, `assets/`, etc.) — stable in Docker and local runs. */
export const APP_ROOT = path.resolve(import.meta.dir, "../..");

export function assetPath(...parts: string[]): string {
    return path.join(APP_ROOT, "assets", ...parts);
}
