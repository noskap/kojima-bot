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

# Fail the build if assets did not make it into the image (common on partial clones).
RUN test -f /app/assets/images/cat.png && \
    test "$(ls -1 /app/assets/images/spawn 2>/dev/null | wc -l)" -gt 0 && \
    test "$(ls -1 /app/assets/images/meme 2>/dev/null | wc -l)" -gt 0

RUN mkdir -p /app/data

ENV DB_FILE=/app/data/bot.sqlite

VOLUME ["/app/data"]

CMD ["bun", "src/index.ts"]
