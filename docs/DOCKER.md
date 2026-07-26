# ayantaraz Docker Documentation

## Overview

This document describes the Docker architecture and best practices for the ayantaraz project.

## Architecture

### Container Structure

The application consists of 5 main containers:

1. **API** (`ayantaraz-api`)
   - Node.js application (NestJS)
   - Port: 3001
   - Dependencies: PostgreSQL, Redis

2. **Web** (`ayantaraz-web`)
   - Next.js application
   - Port: 3000
   - Dependencies: API

3. **PostgreSQL** (`ayantaraz-postgres`)
   - PostgreSQL 15 (Alpine)
   - Port: 5432
   - Persistent volume: `postgres_data`

4. **Redis** (`ayantaraz-redis`)
   - Redis 7 (Alpine)
   - Port: 6379
   - Persistent volume: `redis_data`

5. **Nginx** (`ayantaraz-nginx`)
   - Nginx (Alpine)
   - Port: 80
   - Reverse proxy for API and Web

### Network

- Custom bridge network: `ayantaraz-network`
- All containers can communicate via hostnames
- Isolated from host network

### Volumes

- `postgres_data`: PostgreSQL data
- `redis_data`: Redis data
- `uploads`: File uploads

## Dockerfiles

### API Dockerfile (`apps/api/Dockerfile`)

Multi-stage build with 3 stages:

1. **deps**: Install dependencies
2. **builder**: Build application and generate Prisma client
3. **runner**: Production runtime with non-root user

**Features**:
- Alpine-based images (small footprint)
- Multi-stage build (optimized size)
- Non-root user for security
- Health check configured
- Prisma client generation
- Seed script bundling

### Web Dockerfile (`apps/web/Dockerfile`)

Multi-stage build with 3 stages:

1. **deps**: Install dependencies
2. **builder**: Build Next.js application
3. **runner**: Production runtime with non-root user

**Features**:
- Alpine-based images
- Multi-stage build
- Non-root user for security
- Health check configured
- Standalone Next.js output

## Docker Compose Files

### Base (`docker-compose.yml`)

Defines the basic service configuration for development.

**Services**:
- api
- web
- postgres
- redis
- nginx

### Production (`docker-compose.production.yml`)

Overrides base configuration for production deployment.

**Key Differences**:
- Uses `.env.production` file
- Configures production environment variables
- Sets resource limits
- Configures health checks
- Uses specific container names
- Configures logging

## Environment Configuration

### Environment Files

1. **`.env.example`**: Template with placeholder values
2. **`.env.production`**: Production configuration with secure defaults
3. **`.env`**: Local development (not committed)

### Required Variables

See `.env.example` for complete list of required variables.

### Production Defaults

The `.env.production` file includes secure default values for:
- Database credentials
- Redis credentials
- JWT secrets
- File encryption key
- Session secret

**Note**: You must set `SMS_API_KEY` for OTP functionality to work.

## Building Images

### Local Build
```bash
# Build all images
docker compose build

# Build with no cache
docker compose build --no-cache

# Build specific service
docker compose build api
```

### Production Build
```bash
# Build with production configuration
docker compose -f docker-compose.yml -f docker-compose.production.yml build --no-cache
```

## Running Containers

### Development
```bash
# Start all services
docker compose up -d

# Start with logs
docker compose up

# Stop all services
docker compose down

# Stop with volume removal
docker compose down -v
```

### Production
```bash
# Start with production configuration
docker compose -f docker-compose.yml -f docker-compose.production.yml up -d

# Stop production services
docker compose -f docker-compose.yml -f docker-compose.production.yml down
```

## Docker Commands

### Container Management
```bash
# List all containers
docker ps -a

# View container logs
docker logs <container_name>

# Follow container logs
docker logs -f <container_name>

# Execute command in container
docker exec -it <container_name> <command>

# Restart container
docker restart <container_name>

# Stop container
docker stop <container_name>

# Start container
docker start <container_name>

# Remove container
docker rm <container_name>
```

### Image Management
```bash
# List all images
docker images

# Remove image
docker rmi <image_name>

# Remove all unused images
docker image prune -a
```

### Volume Management
```bash
# List all volumes
docker volume ls

# Inspect volume
docker volume inspect <volume_name>

# Remove volume
docker volume rm <volume_name>

# Remove all unused volumes
docker volume prune
```

### Network Management
```bash
# List all networks
docker network ls

# Inspect network
docker network inspect <network_name>

# Remove network
docker network rm <network_name>
```

### System Management
```bash
# View system information
docker info

# View resource usage
docker stats

# Clean up system
docker system prune -a

# View disk usage
docker system df
```

## Health Checks

All services have health checks configured:

### API
```yaml
healthcheck:
  test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3001/health"]
  interval: 30s
  timeout: 5s
  retries: 3
  start_period: 60s
```

### PostgreSQL
```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U ayantaraz"]
  interval: 10s
  timeout: 5s
  retries: 5
```

### Redis
```yaml
healthcheck:
  test: ["CMD-SHELL", "redis-cli -a ayantarazRedis@2025 ping"]
  interval: 10s
  timeout: 5s
  retries: 5
```

### Web
```yaml
healthcheck:
  test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://127.0.0.1:3000"]
  interval: 30s
  timeout: 5s
  retries: 3
  start_period: 60s
```

## Security Best Practices

### Non-Root Users
All containers run as non-root users:
- API: `nestjs` (UID 1001)
- Web: `nextjs` (UID 1001)

### Secrets Management
- Never hardcode secrets in Dockerfiles
- Use environment variables
- Use `.env` files (not committed to repository)
- Use Docker secrets for production (future enhancement)

### Network Security
- Use custom bridge network
- Isolate containers from host network
- Use internal Docker DNS for service discovery

### Image Security
- Use Alpine-based images (smaller attack surface)
- Regularly update base images
- Scan images for vulnerabilities
- Use multi-stage builds to reduce image size

## Performance Optimization

### Image Size
- Multi-stage builds reduce final image size
- Alpine-based images are smaller
- Remove unnecessary files in final stage
- Use `.dockerignore` to exclude files

### Build Cache
- Docker caches build layers
- Order Dockerfile commands to maximize cache usage
- Use `--no-cache` flag when needed

### Resource Limits
Configure resource limits in `docker-compose.production.yml`:
```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 2G
    reservations:
      cpus: '0.5'
      memory: 512M
```

## Monitoring

### Container Logs
```bash
# View all logs
docker compose logs -f

# View specific service logs
docker compose logs -f api

# View logs with timestamps
docker compose logs -f --timestamps
```

### Resource Usage
```bash
# View real-time resource usage
docker stats

# View historical data
docker stats --no-stream
```

### Health Status
```bash
# Check container health
docker inspect --format='{{json .State.Health}}' <container_name>

# List health status of all containers
docker ps --format "table {{.Names}}\t{{.Status}}"
```

## Backup and Restore

### Database Backup
```bash
# Create backup
docker exec ayantaraz-postgres pg_dump -U ayantaraz -d ayantaraz > backup.sql

# Create compressed backup
docker exec ayantaraz-postgres pg_dump -U ayantaraz -d ayantaraz | gzip > backup.sql.gz

# Automated backup (cron job)
0 2 * * * docker exec ayantaraz-postgres pg_dump -U ayantaraz -d ayantaraz | gzip > /backup/ayantaraz_$(date +\%Y\%m\%d).sql.gz
```

### Database Restore
```bash
# Restore from backup
cat backup.sql | docker exec -i ayantaraz-postgres psql -U ayantaraz -d ayantaraz

# Restore from compressed backup
gunzip -c backup.sql.gz | docker exec -i ayantaraz-postgres psql -U ayantaraz -d ayantaraz
```

### Volume Backup
```bash
# Backup PostgreSQL volume
docker run --rm --volumes-from ayantaraz-postgres -v $(pwd):/backup alpine tar cvf /backup/postgres_backup.tar /var/lib/postgresql/data

# Backup Redis volume
docker run --rm --volumes-from ayantaraz-redis -v $(pwd):/backup alpine tar cvf /backup/redis_backup.tar /data

# Backup uploads volume
docker run --rm --volumes-from ayantaraz-api -v $(pwd):/backup alpine tar cvf /backup/uploads_backup.tar /app/uploads
```

### Volume Restore
```bash
# Restore PostgreSQL volume
docker run --rm --volumes-from ayantaraz-postgres -v $(pwd):/backup alpine tar xvf /backup/postgres_backup.tar -C /

# Restore Redis volume
docker run --rm --volumes-from ayantaraz-redis -v $(pwd):/backup alpine tar xvf /backup/redis_backup.tar -C /

# Restore uploads volume
docker run --rm --volumes-from ayantaraz-api -v $(pwd):/backup alpine tar xvf /backup/uploads_backup.tar -C /
```

## Troubleshooting

### Common Issues

#### Issue: Container won't start
**Solution**:
```bash
# Check logs
docker logs <container_name>

# Check container status
docker inspect <container_name>

# Remove and recreate
docker rm <container_name>
docker compose up -d
```

#### Issue: Database connection failed
**Solution**:
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check PostgreSQL logs
docker logs ayantaraz-postgres

# Test connection
docker exec -it ayantaraz-api psql -h postgres -U ayantaraz -d ayantaraz -c "SELECT 1"

# Check environment variables
docker exec ayantaraz-api env | grep DATABASE_URL
```

#### Issue: Redis connection failed
**Solution**:
```bash
# Check if Redis is running
docker ps | grep redis

# Check Redis logs
docker logs ayantaraz-redis

# Test connection
docker exec -it ayantaraz-api redis-cli -h redis -a ayantarazRedis@2025 ping
```

#### Issue: Port already in use
**Solution**:
```bash
# Find which container is using the port
docker ps -a

# Stop the conflicting container
docker stop <container_name>

# Remove the container
docker rm <container_name>

# Restart services
docker compose up -d
```

#### Issue: Build fails
**Solution**:
```bash
# Check build logs
docker compose build

# Build with no cache
docker compose build --no-cache

# Check Node.js version
node -v

# Check pnpm version
pnpm -v
```

#### Issue: Health check fails
**Solution**:
```bash
# Check container logs
docker logs <container_name>

# Manually test health endpoint
curl http://localhost:3001/health

# Increase health check timeout
# Edit docker-compose.yml to increase timeout
```

## Best Practices

### Dockerfile Best Practices

1. **Use multi-stage builds** to reduce image size
2. **Use Alpine-based images** for smaller footprint
3. **Order commands** to maximize cache usage
4. **Use non-root users** for security
5. **Set proper permissions** for files
6. **Use `.dockerignore`** to exclude unnecessary files
7. **Use health checks** for production containers
8. **Set resource limits** for production containers

### Docker Compose Best Practices

1. **Use version 3.8+** for latest features
2. **Define health checks** for all services
3. **Configure restart policies** (e.g., `unless-stopped`)
4. **Use environment files** for configuration
5. **Define dependencies** between services
6. **Configure logging** with size limits
7. **Use custom networks** for isolation
8. **Use named volumes** for persistent data

### Production Best Practices

1. **Use production-specific configuration**
2. **Enable health checks** for all services
3. **Configure resource limits**
4. **Use non-root users**
5. **Enable logging** with rotation
6. **Configure monitoring**
7. **Set up backups**
8. **Test rollback procedure**

## Future Enhancements

### Planned Improvements
- [ ] Add Docker secrets support
- [ ] Add configuration management (e.g., HashiCorp Consul)
- [ ] Add service mesh (e.g., Linkerd, Istio)
- [ ] Add distributed tracing
- [ ] Add metrics collection
- [ ] Add log aggregation

### Security Enhancements
- [ ] Add image signing
- [ ] Add image scanning in CI/CD
- [ ] Add runtime security monitoring
- [ ] Add network policies

### Performance Enhancements
- [ ] Add build cache optimization
- [ ] Add parallel build support
- [ ] Add image optimization
- [ ] Add resource auto-scaling

---

**Last Updated**: July 2026  
**Version**: 2.0
