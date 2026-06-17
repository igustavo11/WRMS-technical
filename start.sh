#!/bin/sh
set -e

cd /app

echo "Setting up database..."
bun setup-db.ts

echo "Running migrations..."
bunx prisma migrate deploy

echo "Seeding database..."
bunx prisma db seed

echo "Starting backend..."
bun src/server.ts &

echo "Starting nginx..."
exec nginx -g "daemon off;"
