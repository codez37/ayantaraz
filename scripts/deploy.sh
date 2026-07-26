#!/bin/bash

# Production Deployment Script for Ayantaraz
# Usage: ./scripts/deploy.sh [environment]
# Environment: production (default), staging

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default environment
ENVIRONMENT=${1:-production}

echo -e "${BLUE}🚀 Starting Ayantaraz Deployment (${ENVIRONMENT})${NC}"
echo "================================================"

# Step 1: Pull latest changes
echo -e "${YELLOW}📥 Step 1: Pulling latest changes...${NC}"
git pull origin main

echo -e "${GREEN}✅ Latest changes pulled${NC}"
echo ""

# Step 2: Install dependencies
echo -e "${YELLOW}📦 Step 2: Installing dependencies...${NC}"

if [ ! -d "node_modules" ]; then
    echo "Installing all dependencies..."
    pnpm install --frozen-lockfile
else
    echo "Updating dependencies..."
    pnpm install --frozen-lockfile --production=false
fi

echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 3: Generate Prisma client
echo -e "${YELLOW}🗄 Step 3: Generating Prisma client...${NC}"
pnpm run db:generate

echo -e "${GREEN}✅ Prisma client generated${NC}"
echo ""

# Step 4: Run database migrations
echo -e "${YELLOW}🔄 Step 4: Running database migrations...${NC}"

if [ "$ENVIRONMENT" = "production" ]; then
    pnpm run db:migrate:prod
else
    pnpm run db:migrate
fi

echo -e "${GREEN}✅ Database migrations applied${NC}"
echo ""

# Step 5: Seed database (optional)
echo -e "${YELLOW}🌱 Step 5: Seeding database...${NC}"

if [ "$ENVIRONMENT" = "production" ]; then
    echo "Skipping seed in production (data already exists)"
else
    pnpm run db:seed
    echo -e "${GREEN}✅ Database seeded${NC}"
fi

echo ""

# Step 6: Build application
echo -e "${YELLOW}🏗 Step 6: Building application...${NC}"

pnpm run build

echo -e "${GREEN}✅ Application built${NC}"
echo ""

# Step 7: Stop existing containers
echo -e "${YELLOW}⏹ Step 7: Stopping existing containers...${NC}"

docker compose down

echo -e "${GREEN}✅ Containers stopped${NC}"
echo ""

# Step 8: Remove old images
echo -e "${YELLOW}🗑 Step 8: Removing old images...${NC}"

docker system prune -f

echo -e "${GREEN}✅ Old images removed${NC}"
echo ""

# Step 9: Start containers
echo -e "${YELLOW}🚀 Step 9: Starting containers...${NC}"

if [ "$ENVIRONMENT" = "production" ]; then
    docker compose -f docker-compose.yml up -d --build
else
    docker compose up -d --build
fi

echo -e "${GREEN}✅ Containers started${NC}"
echo ""

# Step 10: Wait for services to be healthy
echo -e "${YELLOW}⏳ Step 10: Waiting for services to be healthy...${NC}"

sleep 30

echo ""

# Step 11: Run health check
echo -e "${YELLOW}🔍 Step 11: Running health check...${NC}"

./scripts/healthcheck.sh

echo ""
echo "================================================"
echo -e "${GREEN}🎉 Deployment Completed Successfully!${NC}"
echo ""
echo "Services:"
echo "  - API:     http://202.133.91.13:3001"
echo "  - Web:     http://202.133.91.13:3000"
echo "  - Nginx:   http://202.133.91.13"
echo "  - Health:  http://202.133.91.13/api/health"
echo "  - Swagger: http://202.133.91.13:3001/api/docs"
echo ""
echo "To check logs:"
echo "  docker compose logs -f"
echo ""
echo "To stop services:"
echo "  docker compose down"
