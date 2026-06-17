FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json bun.lock ./
COPY prisma ./prisma/

RUN bun install --frozen-lockfile
RUN bunx prisma generate

COPY . .

EXPOSE 3333

ENTRYPOINT ["sh", "entrypoint.sh"]
