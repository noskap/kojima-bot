import dotenv from "dotenv";
dotenv.config();

export const CONFIG = {
  TOKEN: process.env.DISCORD_TOKEN as string,
  CLIENT_ID: process.env.CLIENT_ID as string,
  // Re-skinning: The name of the entity to catch (e.g. "Cat", "Dog", "Gnome")
  ENTITY_NAME: process.env.ENTITY_NAME || "Cat",
  /** Message text that catches the spawn (default: lowercased ENTITY_NAME) */
  CATCH_TRIGGER: (process.env.CATCH_TRIGGER || process.env.ENTITY_NAME || "Cat").toLowerCase(),
  // Single server restriction
  GUILD_ID: process.env.GUILD_ID as string,

  /**
   * Seconds a spawn can sit uncaught before we strip the image, grey out the button, and clear DB.
   * Set `SPAWN_TTL_SECONDS=0` in `.env` to disable expiry.
   */
  SPAWN_TTL_SECONDS: (() => {
    const v = process.env.SPAWN_TTL_SECONDS;
    if (v === undefined || v === "") return 900;
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) && n >= 0 ? n : 900;
  })(),
  
  // Database configuration
  DB_FILE: "bot.sqlite",
};

// Validate critical config
if (!CONFIG.TOKEN) {
  throw new Error("Missing DISCORD_TOKEN in .env");
}
