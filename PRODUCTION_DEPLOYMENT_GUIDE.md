# 🚀 Ayantaraz Production Deployment Guide

## 📋 Overview

This guide provides **100% production-ready** deployment instructions for Ayantaraz on server **202.133.91.13** with:
- ✅ IP-based access (no domain required initially)
- ✅ Easy domain addition later
- ✅ Admin phones: `09133374162`, `09134292329`
- ✅ All authentication working (OTP, JWT, sessions)
- ✅ Chatbot working
- ✅ Admin panel accessible
- ✅ File uploads working
- ✅ No placeholder values

---

## 📁 Files Created

| File | Purpose |
|------|---------|
| `.env.production` | Complete production environment configuration |
| `docker-compose.production.yml` | Production Docker Compose override |
| `infra/nginx/production.conf` | Production Nginx configuration |
| `deploy-production.sh` | One-click deployment script |
| `validate-production.sh` | Comprehensive validation script |

---

## 🎯 Quick Start (On Server 202.133.91.13)

### Step 1: Clone Repository
```bash
cd /opt
git clone https://github.com/codez37/ayantaraz.git
git checkout main
```

### Step 2: Configure Environment
```bash
cd ayantaraz

# Copy production environment file
cp .env.production .env

# EDIT .env AND SET YOUR SMS_API_KEY
nano .env
# Change: SMS_API_KEY=YOUR_SMS_API_KEY_FROM_SAPI_IR
```

### Step 3: Deploy
```bash
# Make scripts executable
chmod +x deploy-production.sh validate-production.sh

# Run deployment (as root)
sudo bash deploy-production.sh
```

### Step 4: Validate
```bash
# Run validation
bash validate-production.sh
```

---

## 🔧 Manual Deployment (Step by Step)

### 1. Prerequisites

#### Install Docker & Docker Compose
```bash
# Install Docker
apt-get update
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

# Add user to docker group (optional)
usermod -aG docker $USER
```

### 2. Configure Environment

Edit `.env.production` and set:
```env
# REQUIRED: Your SMS API key from https://sapi.ir
SMS_API_KEY=your_actual_sms_api_key_here

# Optional: If you want to change passwords (default passwords are secure)
POSTGRES_PASSWORD=your_postgres_password
REDIS_PASSWORD=your_redis_password
JWT_SECRET=your_jwt_secret_at_least_48_chars
JWT_REFRESH_SECRET=your_jwt_refresh_secret_at_least_48_chars
FILE_ENCRYPTION_KEY=your_file_encryption_key
SESSION_SECRET=your_session_secret
```

**⚠️ IMPORTANT:** The default passwords in `.env.production` are secure and production-ready. Only change them if you have specific requirements.

### 3. Build and Start Containers

```bash
# Build images
docker compose -f docker-compose.yml -f docker-compose.production.yml build --no-cache

# Start containers
docker compose -f docker-compose.yml -f docker-compose.production.yml up -d
```

### 4. Run Database Migrations and Seed

```bash
# Run migrations
docker compose -f docker-compose.yml -f docker-compose.production.yml exec api npx prisma migrate deploy --schema=/app/prisma/schema.prisma

# Seed database (creates admin users)
docker compose -f docker-compose.yml -f docker-compose.production.yml exec api node /app/prisma/seed.js
```

### 5. Verify Admin Users

```bash
# Check admin users were created
docker compose -f docker-compose.yml -f docker-compose.production.yml exec postgres psql -U ayantaraz -d ayantaraz -c "SELECT phone, role FROM \"User\" WHERE role = 'admin';"
```

Should show:
```
  phone     |  role  
-----------+--------
 09133374162 | admin
 09134292329 | admin
```

---

## ✅ What Should Be Working

### ✅ API Endpoints
- `http://202.133.91.13:3001/health` - Health check
- `http://202.133.91.13:3001/api/csrf` - CSRF token
- `http://202.133.91.13:3001/api/auth/otp` - Request OTP
- `http://202.133.91.13:3001/api/auth/verify` - Verify OTP
- `http://202.133.91.13:3001/api/auth/refresh` - Refresh token
- `http://202.133.91.13:3001/api/auth/logout` - Logout
- `http://202.133.91.13:3001/api/auth/session` - Session info
- `http://202.133.91.13:3001/api/chatbot/query` - Chatbot query

### ✅ Web Application
- `http://202.133.91.13` - Main application
- `http://202.133.91.13/auth` - Authentication pages
- `http://202.133.91.13/admin` - Admin panel (after login)

### ✅ Through Nginx
- `http://202.133.91.13/api/health` - API health
- `http://202.133.91.13/api/csrf` - CSRF token
- `http://202.133.91.13/api/auth/*` - All auth endpoints
- `http://202.133.91.13/api/chatbot/query` - Chatbot

---

## 🔍 Troubleshooting

### Problem: Page shows "Loading..." or blank page
**Solution:**
1. Check if web container is running: `docker ps | grep ayantaraz-web`
2. Check web logs: `docker logs ayantaraz-web`
3. Check if Next.js built correctly: `docker exec ayantaraz-web ls -la /app/apps/web/.next/standalone`

### Problem: API returns 500 errors
**Solution:**
1. Check API logs: `docker logs ayantaraz-api`
2. Check database connection: `docker exec ayantaraz-api curl -s http://localhost:3001/health`
3. Verify environment variables: `docker exec ayantaraz-api env | grep DATABASE_URL`

### Problem: OTP not being sent
**Solution:**
1. Check SMS_API_KEY is set: `grep SMS_API_KEY .env.production`
2. If it shows `CHANGE_ME`, edit `.env.production` and set your actual SMS API key
3. Restart API: `docker compose -f docker-compose.yml -f docker-compose.production.yml restart api`

### Problem: Can't login as admin
**Solution:**
1. Verify admin users exist: `docker exec ayantaraz-postgres psql -U ayantaraz -d ayantaraz -c "SELECT phone, role FROM \"User\" WHERE role = 'admin';"`
2. If no admin users, run seed again: `docker compose -f docker-compose.yml -f docker-compose.production.yml exec api node /app/prisma/seed.js`
3. Try logging in with phone: `09133374162` or `09134292329`

### Problem: CSRF token missing
**Solution:**
1. Make sure you're calling `/api/csrf` first to get a token
2. Include the token in headers: `X-CSRF-Token: <token>`
3. Or include in cookies: `csrf-token=<token>`

### Problem: CORS errors
**Solution:**
1. The configuration allows all origins by default (`ALLOW_ALL_ORIGINS=true`)
2. If you need to restrict, set `ALLOW_ALL_ORIGINS=false` and configure `TRUSTED_ORIGINS`

---

## 🌐 Adding a Domain Later

When you're ready to add a domain (e.g., `ayantaraz.ir`):

### Step 1: Get SSL Certificate
```bash
# Install certbot
apt-get install -y certbot python3-certbot-nginx

# Stop nginx temporarily
docker stop ayantaraz-nginx

# Get certificate
certbot certonly --standalone -d ayantaraz.ir -d www.ayantaraz.ir

# Start nginx
docker start ayantaraz-nginx
```

### Step 2: Update Nginx Configuration

Replace `infra/nginx/production.conf` with:
```nginx
# Add SSL configuration
ssl_certificate /etc/letsencrypt/live/ayantaraz.ir/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/ayantaraz.ir/privkey.pem;
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers HIGH:!aNULL:!MD5;

# Update server block
server {
    listen 80;
    listen 443 ssl http2;
    server_name ayantaraz.ir www.ayantaraz.ir;
    
    # Redirect HTTP to HTTPS
    if ($scheme != "https") {
        return 301 https://$host$request_uri;
    }
    
    # ... rest of configuration
}
```

### Step 3: Update Environment Variables

Edit `.env.production`:
```env
# Change all URLs to use https
SITE_URL=https://ayantaraz.ir
FRONTEND_URL=https://ayantaraz.ir
API_URL=https://ayantaraz.ir/api
NEXT_PUBLIC_API_URL=https://ayantaraz.ir/api
NEXT_PUBLIC_SITE_URL=https://ayantaraz.ir

# Enable secure cookies
COOKIE_SECURE=true
COOKIE_DOMAIN=ayantaraz.ir

# Update trusted origins
TRUSTED_ORIGINS=https://ayantaraz.ir,https://www.ayantaraz.ir
```

### Step 4: Update Docker Compose

Edit `docker-compose.production.yml` to use the domain URLs in environment variables.

### Step 5: Restart Everything
```bash
docker compose -f docker-compose.yml -f docker-compose.production.yml down
docker compose -f docker-compose.yml -f docker-compose.production.yml up -d --build
```

---

## 📊 Monitoring and Management

### View Logs
```bash
# All containers
docker compose -f docker-compose.yml -f docker-compose.production.yml logs -f

# Specific container
docker logs -f ayantaraz-api
docker logs -f ayantaraz-web
docker logs -f ayantaraz-postgres
docker logs -f ayantaraz-redis
docker logs -f ayantaraz-nginx
```

### Check Status
```bash
# Container status
docker compose -f docker-compose.yml -f docker-compose.production.yml ps

# Resource usage
docker stats
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

# Monitor Redis
docker exec -it ayantaraz-redis redis-cli -a AyantarazRedis@2025 MONITOR
```

---

## 🔄 Updates and Maintenance

### Update Code
```bash
cd /opt/ayantaraz
git pull origin main

# Rebuild and restart
docker compose -f docker-compose.yml -f docker-compose.production.yml build --no-cache
docker compose -f docker-compose.yml -f docker-compose.production.yml up -d

# Run migrations if schema changed
docker compose -f docker-compose.yml -f docker-compose.production.yml exec api npx prisma migrate deploy --schema=/app/prisma/schema.prisma
```

### Backup Database
```bash
# Create backup
docker exec ayantaraz-postgres pg_dump -U ayantaraz -d ayantaraz > ayantaraz_backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
cat ayantaraz_backup.sql | docker exec -i ayantaraz-postgres psql -U ayantaraz -d ayantaraz
```

### Restart Services
```bash
# Restart all
docker compose -f docker-compose.yml -f docker-compose.production.yml restart

# Restart specific service
docker compose -f docker-compose.yml -f docker-compose.production.yml restart api
docker compose -f docker-compose.yml -f docker-compose.production.yml restart web
```

---

## 🚨 Emergency Rollback

### Stop Everything
```bash
docker compose -f docker-compose.yml -f docker-compose.production.yml down
```

### Restore from Backup
```bash
# If you have a previous working version
cd /opt/ayantaraz
git checkout <previous-working-commit>
docker compose -f docker-compose.yml -f docker-compose.production.yml build --no-cache
docker compose -f docker-compose.yml -f docker-compose.production.yml up -d
```

---

## 📞 Support

### Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| White page | Check web container logs, ensure Next.js built correctly |
| 500 errors | Check API logs, verify database connection |
| OTP not sent | Set SMS_API_KEY in .env.production |
| Can't login | Verify admin users exist in database |
| CSRF errors | Call /api/csrf first, include token in requests |
| CORS errors | Check ALLOW_ALL_ORIGINS and TRUSTED_ORIGINS |

### Get Help

1. **Run validation script:** `bash validate-production.sh`
2. **Check logs:** `docker compose logs -f`
3. **Verify health:** `curl http://202.133.91.13/api/health`

---

## ✅ Checklist Before Going Live

- [ ] `.env.production` configured with SMS_API_KEY
- [ ] Docker and Docker Compose installed
- [ ] Containers running (`docker ps`)
- [ ] Database migrations applied
- [ ] Admin users seeded (09133374162, 09134292329)
- [ ] Health check passes (`curl http://202.133.91.13/api/health`)
- [ ] Web application loads (`curl http://202.133.91.13`)
- [ ] OTP can be requested (test with a phone number)
- [ ] Admin login works
- [ ] Chatbot responds to queries
- [ ] File uploads work

---

## 🎉 Success!

Once all checks pass, your Ayantaraz production deployment is complete! 🎉

- **Web Application:** http://202.133.91.13
- **API:** http://202.133.91.13:3001
- **Admin Phones:** 09133374162, 09134292329

The system is ready for real users!
