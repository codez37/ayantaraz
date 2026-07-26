# Ayantaraz Production Deployment Runbook

## Overview

This document provides step-by-step instructions for deploying Ayantaraz to production on server **202.133.91.13**.

## Prerequisites

### Server Requirements
- **CPU**: 4 cores minimum (8 recommended for production)
- **RAM**: 8GB minimum (16GB recommended)
- **Disk**: 50GB minimum (SSD recommended)
- **OS**: Ubuntu 22.04 LTS or later
- **Network**: 100Mbps minimum

### Required Ports
- **80**: HTTP (Nginx)
- **443**: HTTPS (Nginx) - Optional for now
- **3000**: Web application
- **3001**: API application
- **5432**: PostgreSQL
- **6379**: Redis

## Deployment Methods

### Method 1: Automatic Deployment (Recommended)

#### Step 1: Clone Repository
```bash
ssh root@202.133.91.13
cd /opt
git clone https://github.com/codez37/ayantaraz.git
cd ayantaraz
```

#### Step 2: Configure Environment
```bash
# Copy production environment template
cp .env.production .env

# Edit .env and set your SMS_API_KEY
nano .env
# Change: SMS_API_KEY=YOUR_SMS_API_KEY_FROM_SAPI_IR
```

#### Step 3: Run Deployment Script
```bash
# Make scripts executable
chmod +x deploy-production.sh validate-production.sh

# Run deployment (as root)
sudo bash deploy-production.sh
```

#### Step 4: Validate Deployment
```bash
# Run validation script
bash validate-production.sh
```

### Method 2: Manual Deployment

#### Step 1: Install Dependencies
```bash
# Update system
apt-get update && apt-get upgrade -y

# Install Docker
apt-get install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start Docker
systemctl enable docker
systemctl start docker

# Install Git
apt-get install -y git

# Install curl for health checks
apt-get install -y curl
```

#### Step 2: Clone and Configure
```bash
cd /opt
git clone https://github.com/codez37/ayantaraz.git
cd ayantaraz
cp .env.production .env
nano .env  # Set SMS_API_KEY
```

#### Step 3: Create Uploads Directory
```bash
mkdir -p uploads
chmod -R 755 uploads
```

#### Step 4: Build and Start Containers
```bash
docker compose -f docker-compose.yml -f docker-compose.production.yml build --no-cache
docker compose -f docker-compose.yml -f docker-compose.production.yml up -d
```

#### Step 5: Run Migrations and Seed
```bash
# Wait for database to be ready
sleep 30

# Run migrations
docker compose -f docker-compose.yml -f docker-compose.production.yml exec api npx prisma migrate deploy --schema=/app/prisma/schema.prisma

# Seed database
docker compose -f docker-compose.yml -f docker-compose.production.yml exec api node /app/prisma/seed.js
```

#### Step 6: Verify
```bash
# Check containers
docker compose -f docker-compose.yml -f docker-compose.production.yml ps

# Test health
curl http://localhost:3001/health

# Test web
curl http://localhost:3000

# Test through nginx
curl http://localhost/api/health
curl http://localhost/
```

## Post-Deployment Checks

### 1. Verify All Services Are Running
```bash
docker ps -a
```

Expected containers:
- `ayantaraz-api` - API service (port 3001)
- `ayantaraz-web` - Web application (port 3000)
- `ayantaraz-postgres` - PostgreSQL database (port 5432)
- `ayantaraz-redis` - Redis cache (port 6379)
- `ayantaraz-nginx` - Nginx reverse proxy (port 80)

### 2. Verify Database
```bash
# Connect to database
docker exec -it ayantaraz-postgres psql -U ayantaraz -d ayantaraz

# Check tables
\dt

# Check admin users
SELECT phone, role FROM "User" WHERE role = 'admin';
```

Expected admin users:
- `09133374162` (admin)
- `09134292329` (admin)

### 3. Verify Redis
```bash
# Connect to Redis
docker exec -it ayantaraz-redis redis-cli -a AyantarazRedis@2025

# Test connection
ping
# Expected response: PONG
```

### 4. Test API Endpoints
```bash
# Health check
curl http://202.133.91.13:3001/health

# CSRF token
curl http://202.133.91.13:3001/api/csrf

# Request OTP (test phone)
curl -X POST http://202.133.91.13:3001/api/auth/otp \
  -H 'Content-Type: application/json' \
  -d '{"phone": "09120000000"}'
```

### 5. Test Web Application
```bash
# Main page
curl http://202.133.91.13

# Admin login page
curl http://202.133.91.13/auth
```

## Monitoring and Management

### View Logs
```bash
# All containers
cd /opt/ayantaraz
docker compose -f docker-compose.yml -f docker-compose.production.yml logs -f

# Specific container
docker logs -f ayantaraz-api
docker logs -f ayantaraz-web
docker logs -f ayantaraz-postgres
docker logs -f ayantaraz-redis
docker logs -f ayantaraz-nginx
```

### Check Resource Usage
```bash
# Docker stats
docker stats

# System resources
top
htop
```

### Database Management
```bash
# Connect to PostgreSQL
docker exec -it ayantaraz-postgres psql -U ayantaraz -d ayantaraz

# Run Prisma Studio
docker compose -f docker-compose.yml -f docker-compose.production.yml exec api npx prisma studio --schema=/app/prisma/schema.prisma
```

### Redis Management
```bash
# Connect to Redis
docker exec -it ayantaraz-redis redis-cli -a AyantarazRedis@2025

# Monitor commands
docker exec -it ayantaraz-redis redis-cli -a AyantarazRedis@2025 MONITOR

# Check memory usage
docker exec -it ayantaraz-redis redis-cli -a AyantarazRedis@2025 INFO memory
```

## Backup and Restore

### Database Backup
```bash
# Create backup
docker exec ayantaraz-postgres pg_dump -U ayantaraz -d ayantaraz > ayantaraz_backup_$(date +%Y%m%d_%H%M%S).sql

# Create compressed backup
docker exec ayantaraz-postgres pg_dump -U ayantaraz -d ayantaraz | gzip > ayantaraz_backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Automated daily backup (add to crontab)
0 2 * * * cd /opt/ayantaraz && docker exec ayantaraz-postgres pg_dump -U ayantaraz -d ayantaraz | gzip > /backup/ayantaraz_$(date +\%Y\%m\%d).sql.gz
```

### Database Restore
```bash
# Restore from backup
cat ayantaraz_backup.sql | docker exec -i ayantaraz-postgres psql -U ayantaraz -d ayantaraz

# Restore from compressed backup
gunzip -c ayantaraz_backup.sql.gz | docker exec -i ayantaraz-postgres psql -U ayantaraz -d ayantaraz
```

### Volume Backup
```bash
# Backup all Docker volumes
docker run --rm --volumes-from ayantaraz-postgres -v $(pwd):/backup alpine tar cvf /backup/postgres_backup.tar /var/lib/postgresql/data

docker run --rm --volumes-from ayantaraz-redis -v $(pwd):/backup alpine tar cvf /backup/redis_backup.tar /data
```

## Updates and Maintenance

### Update Application
```bash
cd /opt/ayantaraz

# Pull latest changes
git pull origin main

# Rebuild and restart
docker compose -f docker-compose.yml -f docker-compose.production.yml build --no-cache
docker compose -f docker-compose.yml -f docker-compose.production.yml up -d

# Run migrations if schema changed
docker compose -f docker-compose.yml -f docker-compose.production.yml exec api npx prisma migrate deploy --schema=/app/prisma/schema.prisma
```

### Update Docker Images
```bash
# Pull latest images
docker compose -f docker-compose.yml -f docker-compose.production.yml pull

# Rebuild and restart
docker compose -f docker-compose.yml -f docker-compose.production.yml up -d --build
```

### Update Dependencies
```bash
# Update pnpm dependencies
pnpm update

# Update Docker images
# Edit Dockerfiles to use newer base images
# Then rebuild
```

## Troubleshooting

### Common Issues

#### Issue: Containers won't start
**Solution:**
```bash
# Check logs
docker compose -f docker-compose.yml -f docker-compose.production.yml logs

# Check specific container logs
docker logs ayantaraz-api

# Remove and recreate containers
docker compose -f docker-compose.yml -f docker-compose.production.yml down
docker compose -f docker-compose.yml -f docker-compose.production.yml up -d
```

#### Issue: Database connection failed
**Solution:**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check PostgreSQL logs
docker logs ayantaraz-postgres

# Test connection manually
docker exec -it ayantaraz-api psql -h postgres -U ayantaraz -d ayantaraz -c "SELECT 1"

# Check environment variables
docker exec ayantaraz-api env | grep DATABASE_URL
```

#### Issue: Redis connection failed
**Solution:**
```bash
# Check if Redis is running
docker ps | grep redis

# Check Redis logs
docker logs ayantaraz-redis

# Test connection manually
docker exec -it ayantaraz-api redis-cli -h redis -a AyantarazRedis@2025 ping
```

#### Issue: OTP not being sent
**Solution:**
```bash
# Check SMS_API_KEY is set
grep SMS_API_KEY .env.production

# If it shows CHANGE_ME, edit .env.production
nano .env.production

# Restart API
docker compose -f docker-compose.yml -f docker-compose.production.yml restart api
```

#### Issue: Can't login as admin
**Solution:**
```bash
# Check admin users exist
docker exec ayantaraz-postgres psql -U ayantaraz -d ayantaraz -c "SELECT phone, role FROM \"User\" WHERE role = 'admin';"

# If no admin users, run seed again
docker compose -f docker-compose.yml -f docker-compose.production.yml exec api node /app/prisma/seed.js
```

#### Issue: CORS errors
**Solution:**
```bash
# Check ALLOW_ALL_ORIGINS setting
grep ALLOW_ALL_ORIGINS .env.production

# If false, check TRUSTED_ORIGINS
grep TRUSTED_ORIGINS .env.production

# Update .env.production and restart
docker compose -f docker-compose.yml -f docker-compose.production.yml restart api
```

#### Issue: 502 Bad Gateway (Nginx)
**Solution:**
```bash
# Check Nginx logs
docker logs ayantaraz-nginx

# Check Nginx configuration
docker exec ayantaraz-nginx nginx -t

# Check if API is running
docker ps | grep api

# Test API directly
curl http://localhost:3001/health

# Restart Nginx
docker restart ayantaraz-nginx
```

### Debug Mode

To enable debug mode for troubleshooting:

```bash
# Edit .env.production
nano .env.production

# Change LOG_LEVEL
LOG_LEVEL=debug

# Restart containers
docker compose -f docker-compose.yml -f docker-compose.production.yml restart
```

## Rollback Procedure

### Quick Rollback
```bash
cd /opt/ayantaraz

# Stop all containers
docker compose -f docker-compose.yml -f docker-compose.production.yml down

# Checkout previous working commit
git checkout <previous-working-commit>

# Rebuild and restart
docker compose -f docker-compose.yml -f docker-compose.production.yml build --no-cache
docker compose -f docker-compose.yml -f docker-compose.production.yml up -d

# Run migrations
docker compose -f docker-compose.yml -f docker-compose.production.yml exec api npx prisma migrate deploy --schema=/app/prisma/schema.prisma

# Seed database
docker compose -f docker-compose.yml -f docker-compose.production.yml exec api node /app/prisma/seed.js
```

### Database Rollback
```bash
# Restore from backup
cat /backup/ayantaraz_backup.sql | docker exec -i ayantaraz-postgres psql -U ayantaraz -d ayantaraz
```

## Security

### Change Passwords

To change database or Redis passwords:

1. Edit `.env.production` and update passwords
2. Update `docker-compose.production.yml` with new passwords
3. Stop containers: `docker compose -f docker-compose.yml -f docker-compose.production.yml down`
4. Remove old volumes: `docker volume rm ayantaraz-postgres_data ayantaraz-redis_data`
5. Start containers: `docker compose -f docker-compose.yml -f docker-compose.production.yml up -d`
6. Run migrations and seed again

### Enable HTTPS

When ready to add a domain and enable HTTPS:

1. Get SSL certificate (using certbot):
```bash
apt-get install -y certbot python3-certbot-nginx
certbot certonly --standalone -d ayantaraz.ir -d www.ayantaraz.ir
```

2. Update Nginx configuration to use SSL

3. Update `.env.production`:
```env
COOKIE_SECURE=true
SITE_URL=https://ayantaraz.ir
API_URL=https://ayantaraz.ir/api
FRONTEND_URL=https://ayantaraz.ir
NEXT_PUBLIC_API_URL=https://ayantaraz.ir/api
NEXT_PUBLIC_SITE_URL=https://ayantaraz.ir
```

4. Update `docker-compose.production.yml` with HTTPS URLs

5. Restart containers

### Firewall Configuration

```bash
# Install UFW
apt-get install -y ufw

# Allow necessary ports
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp

# Enable UFW
ufw enable
```

## Performance Tuning

### Database Optimization
```bash
# Connect to PostgreSQL
docker exec -it ayantaraz-postgres psql -U ayantaraz -d ayantaraz

# Check slow queries
SELECT query, total_time, calls FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;

# Add indexes for frequently queried columns
CREATE INDEX idx_user_phone ON "User"(phone);
CREATE INDEX idx_content_slug ON "Content"(slug);
```

### Redis Optimization
```bash
# Check Redis memory usage
docker exec -it ayantaraz-redis redis-cli -a AyantarazRedis@2025 INFO memory

# Configure maxmemory policy
docker exec -it ayantaraz-redis redis-cli -a AyantarazRedis@2025 CONFIG SET maxmemory-policy allkeys-lru
```

### Docker Optimization
```bash
# Clean up unused containers, networks, images
docker system prune -a

# Limit container resources
# Edit docker-compose.production.yml to add resource limits:
#   deploy:
#     resources:
#       limits:
#         cpus: '2'
#         memory: 2G
```

## Contact and Support

For issues or questions:
- Check logs: `docker compose logs -f`
- Verify health: `curl http://202.133.91.13:3001/health`
- Review documentation: See PRODUCTION_DEPLOYMENT_GUIDE.md
- GitHub Actions: https://github.com/codez37/ayantaraz/actions

## Checklist

### Pre-Deployment
- [ ] Server meets minimum requirements
- [ ] Docker and Docker Compose installed
- [ ] Git installed
- [ ] Repository cloned
- [ ] .env.production configured with SMS_API_KEY
- [ ] Uploads directory created
- [ ] Firewall configured (if needed)

### Deployment
- [ ] Deployment script executed
- [ ] All containers running
- [ ] Database migrations applied
- [ ] Database seeded with admin users
- [ ] Health check passes
- [ ] Web application loads

### Post-Deployment
- [ ] All services verified
- [ ] Admin login tested
- [ ] OTP functionality tested
- [ ] Chatbot tested
- [ ] File uploads tested
- [ ] Monitoring in place
- [ ] Backup procedure configured

### Production Readiness
- [ ] CI/CD pipeline configured
- [ ] Security measures in place
- [ ] Monitoring configured
- [ ] Backup procedure documented
- [ ] Rollback procedure documented
- [ ] All documentation updated

---

**Last Updated**: July 2026  
**Version**: 2.0  
**Server**: 202.133.91.13
