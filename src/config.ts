import dotenv from "dotenv";

dotenv.config();

function envEnabled(key: string): boolean {
  const raw = process.env[key];
  const v = String(raw ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export const CONFIG = {
  TOKEN: process.env.DISCORD_TOKEN as string,
  CLIENT_ID: process.env.CLIENT_ID as string,
  // Re-skinning: The name of the entity to catch (e.g. "Cat", "Dog", "Gnome")
  ENTITY_NAME: process.env.ENTITY_NAME || "Cat",
  /** Message text that catches the spawn (default: lowercased ENTITY_NAME) */
  CATCH_TRIGGER: (process.env.CATCH_TRIGGER || process.env.ENTITY_NAME || "Cat").toLowerCase(),
  // Single server restriction
  GUILD_ID: process.env.GUILD_ID as string,

  /** Env: `LINK_FIXUP_X` = `true`/`1`/`yes`/`on` — rewrite x.com/twitter → fixupx.com and repost. */
  LINK_FIXUP_X: envEnabled("LINK_FIXUP_X"),

  /** Env: `LINK_FIXUP_INSTAGRAM` = same tokens — instagram → vxinstagram (queries stripped). */
  LINK_FIXUP_INSTAGRAM: envEnabled("LINK_FIXUP_INSTAGRAM"),

  // Database configuration
  DB_FILE: "bot.sqlite",
};

// Validate critical config
if (!CONFIG.TOKEN) {
  throw new Error("Missing DISCORD_TOKEN in .env");
}
