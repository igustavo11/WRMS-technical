# Stage 1: Build
FROM oven/bun:1-alpine AS builder

WORKDIR /app

ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile && \
    # rolldown (Vite 8 bundler) resolves react-dom/server to server.bun.js which
    # lacks renderToPipeableStream. Replace with the node version at build time only.
    cp node_modules/react-dom/server.node.js node_modules/react-dom/server.bun.js

COPY . .
RUN bun run build

# Stage 2: Serve
FROM nginx:alpine

COPY --from=builder /app/build/client /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
