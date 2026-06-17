# Stage 1 – Build frontend
FROM oven/bun:1-alpine AS frontend-builder

WORKDIR /app

ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

COPY frontend/package.json frontend/bun.lock ./
# rolldown (Vite 8) resolves react-dom/server to server.bun.js which lacks
# renderToPipeableStream — replace with the node version at build time only
RUN bun install --frozen-lockfile && \
    cp node_modules/react-dom/server.node.js node_modules/react-dom/server.bun.js

COPY frontend/ .
RUN bun run build

# Stage 2 – Final: Bun backend + Nginx (single container for Railway)
FROM oven/bun:1-alpine

RUN apk add --no-cache nginx

WORKDIR /app

COPY backend/package.json backend/bun.lock ./
COPY backend/prisma ./prisma/

RUN bun install --frozen-lockfile && bunx prisma generate

COPY backend/ .

ENV PORT=3333

COPY --from=frontend-builder /app/build/client /usr/share/nginx/html

COPY nginx.conf /etc/nginx/http.d/default.conf
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80

CMD ["/start.sh"]
