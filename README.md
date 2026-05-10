# Kojima Bot

A Discord bot about catching things... rebuilt in Bun!

## Features
- **Random spawns**: Opt a channel in with `/kojima setup`; wild entities appear on a timer with rarity-weighted art from `assets/images/spawn/`.
- **Catch**: Type your catch phrase (see `CATCH_TRIGGER` / `ENTITY_NAME`) **or** press the **Catch** button on the spawn card — first player wins.
- **Slash commands**: `/kojima` (setup, spacing, last catch, leaderboard, **gift**, **achievements**), `/profile`, `/ping`, **`/gamble`** (slots, coin flip, roulette + chip balance).
- **Achievements**: Unlock milestones from catches, gifts, and casino play — see `/kojima achievements`.
- **Customizable**: Rename the entity via `ENTITY_NAME`, swap spawn PNGs, tune fonts in `src/config.ts`.
- **Fast**: [Bun](https://bun.sh) + SQLite (Drizzle).

## Setup

### Prerequisites
- [Bun](https://bun.sh) installed.

### Installation
1.  Clone the repository.
2.  Install dependencies:
    ```bash
    bun install
    ```
3.  Configure Environment:
    ```bash
    cp .env.example .env
    ```
    Edit `.env` and fill in your Token, Client ID, and Guild ID.

### Running the Bot

**Development Mode** (auto-restarts):
```bash
bun run dev
```

**Production Mode**:
```bash
bun start
```

**Slash Commands** (guild-scoped; uses `GUILD_ID` in `.env`):
```bash
bun run deploy
```

In Discord (requires **Manage Channels** where noted):
1. Run `/kojima setup` in the channel where you want spawns.
2. Wait for a spawn; reply with your catch phrase or click **Catch**.
3. Tune timing with `/kojima interval` (min/max seconds between spawns after each catch).

Bot permissions in that channel: **Send Messages**, **Attach Files**, **Embed Links**, **Read Message History** (recommended), **Add Reactions** (optional, for “nice try” 😂 when someone mistypes early).

## Deployment (PM2)
This project includes an `ecosystem.config.js` for easy deployment with PM2.

1.  Make sure you have PM2 installed:
    ```bash
    bun add -g pm2
    ```
2.  Start the bot:
    ```bash
    pm2 start ecosystem.config.js
    ```
3.  Monitor:
    ```bash
    pm2 logs kojima-bot
    ```

## Customization
- **Re-skinning**: Change `ENTITY_NAME` in `.env`.
- **Assets**: Replace images in `assets/images/`.
