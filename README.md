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

**Slash Commands** (guild-scoped; uses `GUILD_ID` in `.env` — see [Multi-server support](#multi-server-support-future) for why):

```bash
bun run deploy
```

For each server you operate, set `GUILD_ID` to that server’s id and run deploy again (or maintain separate `.env` / deploy scripts per server).

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

## Multi-server support (future)

**Current model:** The bot is intended for a small set of servers you operate. Slash commands are registered **per guild** via `GUILD_ID` in `.env` + `bun run deploy`. Gameplay itself is already guild-scoped in SQLite (`/kojima setup` writes `interaction.guildId`); the env `GUILD_ID` is **not** checked at runtime.

To support **any server that invites the bot** (public / multi-tenant), the following would need to change:

### Slash command registration (required)

- **`src/deploy-commands.ts`** — today publishes only to `Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)` and **wipes global commands**. Other servers never see slash commands unless you re-run deploy with their guild id.
- Pick a registration strategy:
  - **Global commands** — `Routes.applicationCommands(CLIENT_ID)` once; commands appear in every server (propagation can take up to ~1 hour on first deploy).
  - **Per-guild on join** — `GuildCreate` handler deploys the same command set to each new `guild.id` (keeps fast local updates, supports 500 commands/guild).
  - **Hybrid** — core commands global; memes guild-scoped on join.
- Extract deploy logic into a shared module callable from both `deploy-commands.ts` and (if used) `GuildCreate`.
- Make **`GUILD_ID` optional** in `config.ts` / `.env.example` — keep only as a dev shortcut for guild-scoped test deploys.
- Update README setup docs to describe the chosen deploy model instead of “required `GUILD_ID`”.

### Meme slash commands (required if going global)

- Today each file in `assets/images/meme/` becomes its own slash command; guild cap is **500**, global cap is **~100**.
- Core commands (`kojima`, `profile`, `gamble`, `ping`, `colonel`, `forcespawn`, …) consume ~7 slots — only ~93 global slots remain for memes as-is.
- **`src/lib/meme-commands.ts`** would need restructuring, e.g.:
  - Single `/meme` command with **autocomplete** over scanned meme files, or
  - A small number of grouped subcommands, or
  - Accept a hard cap and trim registered memes for global deploy.
- Update `registerMemeSlashHandlers` and `buildMemeSlashBodies` to match; rename `MEME_GUILD_COMMAND_CAP` or split guild vs global limits.

### Config that is global today (optional, per-guild branding)

Not blockers for “works in any server,” but one `.env` applies to all guilds:

- **`ENTITY_NAME`** / **`CATCH_TRIGGER`** — catch phrase and spawn copy; would need a `guild_settings` table (or similar) for per-server branding.
- **`LINK_FIXUP_X`**, **`LINK_FIXUP_INSTAGRAM`**, **`LINK_FIXUP_TIKTOK`** — would need per-guild or per-channel toggles if servers should opt in/out independently.

### Colonel / webhooks (optional)

- **`colonel/`** submodule posts to a single `WEBHOOK_URL` — one channel, separate PM2 process.
- `channels.webhook` exists in schema but is **unused** by the Bun bot.
- Multi-server Colonel-style messaging would need per-guild webhook URLs in the database or separate sidecar configs per server.

### Ops and housekeeping (nice to have)

- **`GuildDelete` handler** — optionally remove `channels` rows (and other guild data) when the bot leaves a server.
- **Rate limits** — per-guild deploy on `GuildCreate` must handle REST rate limits if many servers join at once.
- **Duplicate command cleanup** — document migration from guild-only to global (avoid orphaned guild commands lingering).
- **Docker / PM2** — no architectural change; one process still serves all guilds. Do **not** run multiple instances against the same token + SQLite without shared DB and distributed locks.
- **Invite flow** — OAuth scopes (`bot`, `applications.commands`) and [permissions](#discord-permissions) already support multi-server; no change needed beyond slash registration.

### Already multi-guild (no change needed)

- **`channels`**, **`profiles`**, **`achievement_unlocks`** — keyed by `guildId` / channel id.
- **Spawn loop** (`src/services/gameplay.ts`) — iterates all enabled channels across guilds.
- **Slash command handlers** — use `interaction.guildId`; `/kojima setup` enables spawns per channel.
- **Catch text, buttons, gamble, leaderboard, link fixup** — all use message/interaction guild context.
- **SQLite** — single `bot.sqlite` on one host is correct for one bot process serving many guilds.
