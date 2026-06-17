#!/bin/sh
set -e
echo "Setting up database..."
bun setup-db.ts
echo "Running database migrations..."
bunx prisma migrate deploy
echo "Running database seed..."
bunx prisma db seed
echo "Starting server..."
exec bun src/server.ts
