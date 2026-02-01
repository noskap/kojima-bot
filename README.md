# Kojima Bot

A Discord bot about catching things... rebuilt in Bun!

## Features
- **Catch Mechanics**: Catch varied-rarity entities (Cats, Gnomes, whatever you want!).
- **Customizable**: Change the entity name and assets easily.
- **Fast**: Powered by [Bun](https://bun.sh) and SQLite.

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

**Slash Commands**:
If you change commands, update them on Discord:
```bash
bun run deploy
```

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
