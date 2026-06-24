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
    Edit `.env` — see **`.env.example`** for all variables.

    Required: **`DISCORD_TOKEN`**, **`CLIENT_ID`**, **`GUILD_ID`**.

    Common optional knobs: **`ENTITY_NAME`**, **`CATCH_TRIGGER`**, **`LINK_FIXUP_X`**, **`LINK_FIXUP_INSTAGRAM`**, **`LINK_FIXUP_TIKTOK`** (mirror social URLs for embeds — see [Discord permissions](#discord-permissions)).

### Discord permissions

Configure these in the [Discord Developer Portal](https://discord.com/developers/applications) for your application.

#### Privileged intents

Under **Bot** → **Privileged Gateway Intents**, enable:

| Intent | Required | Why |
|--------|----------|-----|
| **Message Content** | Yes | Catch phrase detection, link fixup, keyword reactions |

The bot also uses the **Guilds** and **Guild Messages** intents (non-privileged; enabled by default).

#### OAuth2 invite (scopes)

When generating an invite URL (**OAuth2** → **URL Generator**), select:

- **`bot`**
- **`applications.commands`**

#### Bot permissions (invite URL)

Grant these **Bot Permissions** on the invite. Use the checklist below when adding the bot to a server.

**Required (core bot)**

| Permission | Used for |
|------------|----------|
| **View Channels** | See channels where spawns and commands run |
| **Send Messages** | Spawns, slash replies, link-fixup replies |
| **Embed Links** | Spawn cards and rich command output |
| **Attach Files** | Spawn images |
| **Read Message History** | Resolving active spawn messages on catch / cleanup |

**Recommended**

| Permission | Used for |
|------------|----------|
| **Add Reactions** | “Nice try” 😂 on early mistypes; keyword-triggered app emoji reactions |
| **Send Messages in Threads** | Spawns and catches inside threads |

**Optional (link fixup)**

Only needed in channels where **`LINK_FIXUP_X`**, **`LINK_FIXUP_INSTAGRAM`**, or **`LINK_FIXUP_TIKTOK`** is enabled in `.env`:

| Permission | Used for |
|------------|----------|
| **Manage Messages** | Suppress the broken embed on the user’s original message |

Link fixup replies with a mirror URL (e.g. `fixupx.com`, `vxinstagram.com`, `tnktok.com`) instead of deleting the original, so thread replies stay intact.

#### Member permissions (your moderators)

These are **user** permissions checked by slash commands — the bot does not need them on its role:

| Permission | Commands |
|------------|----------|
| **Manage Channels** | `/kojima setup`, `stop`, `interval`, `next`, `forcespawn` |

Everyone else can use `/kojima last`, `leaderboard`, `gift`, `achievements`, `/profile`, `/gamble`, `/ping`, and meme commands without elevated permissions.

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

In Discord:

1. Run `/kojima setup` in the channel where you want spawns (requires **Manage Channels**).
2. Wait for a spawn; reply with your catch phrase or click **Catch**.
3. Tune timing with `/kojima interval` (min/max seconds between spawns after each catch).

Ensure the bot’s role has the [permissions above](#bot-permissions-invite-url) in spawn channels (and **Manage Messages** where link fixup is enabled).

## Deployment (PM2)
This project includes an `ecosystem.config.cjs` for easy deployment with PM2.

1.  Make sure you have PM2 installed:
    ```bash
    bun add -g pm2
    ```
2.  Start the bot:
    ```bash
    pm2 start ecosystem.config.cjs
    ```
3.  Monitor:
    ```bash
    pm2 logs kojima-bot
    ```

## Troubleshooting (database)

If you see **`no column named ...`** errors, your `bot.sqlite` was created from an older schema. The bot now **auto-adds** common missing columns on startup.

If problems continue: stop the bot, **delete `bot.sqlite`** in the project root, run **`bun run db:push`**, then start again. (You’ll lose local stats.)

## Customization
- **Re-skinning**: Change `ENTITY_NAME` in `.env`.
- **Assets**: Replace images in `assets/images/`.
