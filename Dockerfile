FROM oven/bun:1.2-alpine

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY tsconfig.json drizzle.config.ts ./
COPY drizzle ./drizzle
COPY src ./src
# Colonel quotes submodule — only messages.ts is imported at runtime
COPY colonel/src/data ./colonel/src/data
COPY assets ./assets

RUN mkdir -p /app/data

ENV DB_FILE=/app/data/bot.sqlite

VOLUME ["/app/data"]

CMD ["bun", "src/index.ts"]
