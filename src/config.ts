import dotenv from "dotenv";
dotenv.config();

export const CONFIG = {
  TOKEN: process.env.DISCORD_TOKEN as string,
  CLIENT_ID: process.env.CLIENT_ID as string,
  // Re-skinning: The name of the entity to catch (e.g. "Cat", "Dog", "Gnome")
  ENTITY_NAME: process.env.ENTITY_NAME || "Cat",
  // Single server restriction
  GUILD_ID: process.env.GUILD_ID as string,
  
  // Database configuration
  DB_FILE: "bot.sqlite",
};

export const ASSETS = {
  FONTS: {
    // Relative to the project root when running
    MAIN: "./assets/fonts/whitneysemibold.otf", 
    SECONDARY: "./assets/fonts/ggsans-Medium.ttf",
  },
  IMAGES: {
    CATCH_BG: "./assets/images/catch_bg.png", // User needs to provide this or we use default logic
    // Add more as needed
  },
  AUDIO: {
      BWOMP: "./assets/audio/bwomp.mp3"
  }
};

// Validate critical config
if (!CONFIG.TOKEN) {
  throw new Error("Missing DISCORD_TOKEN in .env");
}
