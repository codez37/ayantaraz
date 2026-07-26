#!/bin/bash
set -euo pipefail

echo "=== ayantaraz Project Initialization ==="
echo ""

# Check prerequisites
echo "Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo "Error: Node.js is required. Install via nvm or nodejs.org"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "Installing pnpm..."; npm install -g pnpm; }
command -v docker >/dev/null 2>&1 || { echo "Warning: Docker not found. Install Docker Desktop for local containers."; }
echo ""

# Install dependencies
echo "Installing dependencies..."
pnpm install
echo ""

# Copy env if not exists
if [ ! -f .env.development ]; then
  echo "Creating .env.development from template..."
  cp .env.example .env.development
fi

# Generate Prisma client
echo "Generating Prisma client..."
pnpm db:generate
echo ""

# Run migrations
echo "Running database migrations..."
pnpm db:migrate
echo ""

# Seed database
echo "Seeding database..."
pnpm db:seed
echo ""

echo "=== Initialization complete ==="
echo ""
echo "To start development:"
echo "  pnpm dev"
echo ""
echo "To start with Docker:"
echo "  pnpm docker:up"
echo "  pnpm dev"
echo ""
