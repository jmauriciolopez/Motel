#!/usr/bin/env bash
# exit on error
set -o errexit

# Install dependencies
npm install

# Generate Prisma Client
npx prisma generate

# Run migrations (using --force in production is not recommended, but 'deploy' is for prod)
# This will apply any pending migrations without resetting the DB.
npx prisma migrate deploy

# Build the project
npm run build
