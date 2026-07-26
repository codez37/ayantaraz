# Ayantaraz Monitoring and Alerting Documentation

## Overview

This document describes the monitoring and alerting setup for the Ayantaraz production deployment on server **202.133.91.13**.

## Monitoring Architecture

### Components

1. **Application Metrics**: Health checks, response times, error rates
2. **Infrastructure Metrics**: CPU, memory, disk, network
3. **Database Metrics**: Query performance, connections, cache hit rate
4. **Redis Metrics**: Memory usage, commands processed, cache hit rate
5. **Nginx Metrics**: Request rate, response times, error rates

### Tools

- **Docker Stats**: Built-in container resource monitoring
- **Health Checks**: Built-in Docker health checks
- **Prometheus**: Metrics collection (future enhancement)
- **Grafana**: Visualization (future enhancement)
- **Alertmanager**: Alerting (future enhancement)

## Current Monitoring

### Docker Health Checks

All services have health checks configured:

#### API Service
- **Endpoint**: `/health`
- **Interval**: 30 seconds
- **Timeout**: 5 seconds
- **Retries**: 3
- **Start Period**: 60 seconds

#### PostgreSQL Service
- **Command**: `pg_isready -U ayantaraz`
- **Interval**: 10 seconds
- **Timeout**: 5 seconds
- **Retries**: 5

#### Redis Service
- **Command**: `redis-cli -a ayantarazRedis@2025 ping`
- **Interval**: 10 seconds
- **Timeout**: 5 seconds
- **Retries**: 5

#### Web Service
- **Endpoint**: `/`
- **Interval**: 30 seconds
- **Timeout**: 5 seconds
- **Retries**: 3
- **Start Period**: 60 seconds

### Health Check Endpoints

| Service | Endpoint | Description |
|---------|----------|-------------|
| API | `/health` | Full health check with database and cache status |
| API | `/ping` | Simple ping endpoint |
| API | `/api/health` | Health check through Nginx |
| Web | `/` | Main page load check |

### Health Check Response

```json
{
  "status": "healthy",
  "timestamp": "2026-07-22T18:49:00.000Z",
  "application": {
    "name": "Ayantaraz API",
    "version": "1.0.0",
    "uptime": 123456
  },
  "database": {
    "status": "up",
    "responseTime": 5
  },
  "cache": {
    "status": "up",
    "responseTime": 2
  },
  "memory": {
    "used": 123456789,
    "total": 1073741824
  }
}
```

## Manual Monitoring

### Container Monitoring

#### View Container Status
```bash
# List all containers
docker ps -a

# View container details
docker inspect <container_name>

# View container logs
docker logs <container_name>

# Follow container logs
docker logs -f <container_name>

# View container resource usage
docker stats <container_name>
```

#### View All Container Logs
```bash
# View logs for all services
docker compose -f docker-compose.yml -f docker-compose.production.yml logs -f

# View logs with timestamps
docker compose -f docker-compose.yml -f docker-compose.production.yml logs -f --timestamps

# View logs for specific service
docker compose -f docker-compose.yml -f docker-compose.production.yml logs -f api
```

### Resource Monitoring

#### CPU and Memory
```bash
# View real-time resource usage
docker stats

# View historical resource usage
docker stats --no-stream

# View system resource usage
top
htop

# View memory usage
free -h

# View disk usage
df -h

# View Docker disk usage
docker system df
```

#### Network Monitoring
```bash
# View network connections
netstat -tuln
ss -tuln

# View network usage
iftop
nload

# View Docker network
docker network inspect ayantaraz-network
```

### Application Monitoring

#### API Monitoring
```bash
# Check API health
curl http://202.133.91.13:3001/health

# Check API through Nginx
curl http://202.133.91.13/api/health

# Check specific API endpoints
curl http://202.133.91.13:3001/api/csrf
curl http://202.133.91.13:3001/api/users

# Check API response time
time curl -s http://202.133.91.13:3001/health > /dev/null
```

#### Web Monitoring
```bash
# Check web application
curl http://202.133.91.13:3000

# Check web through Nginx
curl http://202.133.91.13/

# Check web response time
time curl -s http://202.133.91.13/ > /dev/null
```

### Database Monitoring

#### PostgreSQL Monitoring
```bash
# Connect to PostgreSQL
docker exec -it ayantaraz-postgres psql -U ayantaraz -d ayantaraz

# Check database size
docker exec -it ayantaraz-postgres psql -U ayantaraz -d ayantaraz -c "SELECT pg_size_pretty(pg_database_size('ayantaraz')) as size;"

# Check table sizes
docker exec -it ayantaraz-postgres psql -U ayantaraz -d ayantaraz -c "\n  SELECT table_name, pg_size_pretty(pg_total_relation_size(table_name)) as size 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  ORDER BY pg_total_relation_size(table_name) DESC;
"

# Check active connections
docker exec -it ayantaraz-postgres psql -U ayantaraz -d ayantaraz -c "\n  SELECT count(*) as active_connections 
  FROM pg_stat_activity 
  WHERE state = 'active';
"

# Check slow queries
docker exec -it ayantaraz-postgres psql -U ayantaraz -d ayantaraz -c "\n  SELECT query, total_time, calls 
  FROM pg_stat_statements 
  ORDER BY total_time DESC 
  LIMIT 10;
"

# Check database locks
docker exec -it ayantaraz-postgres psql -U ayantaraz -d ayantaraz -c "\n  SELECT locktype, relation::regclass, mode, transactionid as tid, virtualtransaction as vtid, pid, granted 
  FROM pg_locks 
  WHERE NOT granted;
"

# Check long-running queries
docker exec -it ayantaraz-postgres psql -U ayantaraz -d ayantaraz -c "\n  SELECT pid, now() - query_start as duration, query, state 
  FROM pg_stat_activity 
  WHERE state = 'active' 
  AND now() - query_start > interval '5 minutes' 
  ORDER BY duration DESC;
"
```

#### PostgreSQL Logs
```bash
# View PostgreSQL logs
docker logs ayantaraz-postgres

# Follow PostgreSQL logs
docker logs -f ayantaraz-postgres

# Check for errors
docker logs ayantaraz-postgres | grep -i "error\|fatal\|panic"
```

### Redis Monitoring

#### Redis Commands
```bash
# Connect to Redis
docker exec -it ayantaraz-redis redis-cli -a ayantarazRedis@2025

# Check Redis info
docker exec -it ayantaraz-redis redis-cli -a ayantarazRedis@2025 INFO

# Check memory usage
docker exec -it ayantaraz-redis redis-cli -a ayantarazRedis@2025 INFO memory

# Check server info
docker exec -it ayantaraz-redis redis-cli -a ayantarazRedis@2025 INFO server

# Check clients
docker exec -it ayantaraz-redis redis-cli -a ayantarazRedis@2025 INFO clients

# Check keyspace
docker exec -it ayantaraz-redis redis-cli -a ayantarazRedis@2025 INFO keyspace

# Check all keys
docker exec -it ayantaraz-redis redis-cli -a ayantarazRedis@2025 KEYS "*"

# Check memory usage by key
docker exec -it ayantaraz-redis redis-cli -a ayantarazRedis@2025 --bigkeys

# Check slow log
docker exec -it ayantaraz-redis redis-cli -a ayantarazRedis@2025 SLOWLOG GET
```

#### Redis Monitoring Commands
```bash
# Monitor all commands
docker exec -it ayantaraz-redis redis-cli -a ayantarazRedis@2025 MONITOR

# Check connected clients
docker exec -it ayantaraz-redis redis-cli -a ayantarazRedis@2025 CLIENT LIST

# Check command stats
docker exec -it ayantaraz-redis redis-cli -a ayantarazRedis@2025 INFO commandstats

# Check latency
docker exec -it ayantaraz-redis redis-cli -a ayantarazRedis@2025 --latency-history

# Check latency percentile
docker exec -it ayantaraz-redis redis-cli -a ayantarazRedis@2025 --latency-percentile 50 90 99
```

### Nginx Monitoring

#### Nginx Commands
```bash
# Check Nginx configuration
docker exec ayantaraz-nginx nginx -t

# Reload Nginx configuration
docker exec ayantaraz-nginx nginx -s reload

# Check Nginx status
docker exec ayantaraz-nginx nginx -v

# Check active connections
docker exec ayantaraz-nginx nginx -t 2>&1 | grep "connections"
```

#### Nginx Logs
```bash
# View Nginx access logs
docker logs ayantaraz-nginx

# Follow Nginx logs
docker logs -f ayantaraz-nginx

# Check for errors
docker logs ayantaraz-nginx | grep -i "error\|critical\|alert"

# Check access logs
docker exec ayantaraz-nginx cat /var/log/nginx/access.log

# Check error logs
docker exec ayantaraz-nginx cat /var/log/nginx/error.log
```

#### Nginx Metrics
```bash
# Check request rate
docker logs ayantaraz-nginx | grep "GET /" | wc -l

# Check response times
docker logs ayantaraz-nginx | grep "GET /" | awk '{print $NF}' | sort | uniq -c

# Check error rate
docker logs ayantaraz-nginx | grep " 50" | wc -l
```

## Automated Monitoring Scripts

### Health Check Script

Create a script to check all services:

```bash
#!/bin/bash

# Health Check Script for ayantaraz

SERVER_IP=202.133.91.13

echo "=== Ayantaraz Health Check ==="
echo "Date: $(date)"
echo ""

# Check API
echo "Checking API..."
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://${SERVER_IP}:3001/health)
if [ "$API_STATUS" == "200" ]; then
    echo "✅ API: Healthy (HTTP 200)"
else
    echo "❌ API: Unhealthy (HTTP $API_STATUS)"
fi

# Check Web
echo "Checking Web..."
WEB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://${SERVER_IP}:3000)
if [ "$WEB_STATUS" == "200" ]; then
    echo "✅ Web: Healthy (HTTP 200)"
else
    echo "❌ Web: Unhealthy (HTTP $WEB_STATUS)"
fi

# Check Nginx
echo "Checking Nginx..."
NGINX_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://${SERVER_IP}/api/health)
if [ "$NGINX_STATUS" == "200" ]; then
    echo "✅ Nginx: Healthy (HTTP 200)"
else
    echo "❌ Nginx: Unhealthy (HTTP $NGINX_STATUS)"
fi

# Check PostgreSQL
echo "Checking PostgreSQL..."
PG_STATUS=$(docker exec ayantaraz-postgres pg_isready -U ayantaraz 2>&1)
if echo "$PG_STATUS" | grep -q "accepting connections"; then
    echo "✅ PostgreSQL: Healthy"
else
    echo "❌ PostgreSQL: Unhealthy ($PG_STATUS)"
fi

# Check Redis
echo "Checking Redis..."
REDIS_STATUS=$(docker exec ayantaraz-redis redis-cli -a ayantarazRedis@2025 ping 2>&1)
if echo "$REDIS_STATUS" | grep -q "PONG"; then
    echo "✅ Redis: Healthy"
else
    echo "❌ Redis: Unhealthy ($REDIS_STATUS)"
fi

# Check Containers
echo ""
echo "=== Container Status ==="
docker ps --format "table {{.Names}}\t{{.Status}}"

# Check Resource Usage
echo ""
echo "=== Resource Usage ==="
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

echo ""
echo "=== Health Check Complete ==="
```

Save as `scripts/health-check.sh` and make executable:
```bash
chmod +x scripts/health-check.sh
```

### Performance Monitoring Script

```bash
#!/bin/bash

# Performance Monitoring Script for ayantaraz

SERVER_IP=202.133.91.13
ITERATIONS=10

echo "=== Ayantaraz Performance Monitoring ==="
echo "Date: $(date)"
echo ""

# Test API response time
echo "Testing API response time (${ITERATIONS} requests)..."
TOTAL_TIME=0
for i in $(seq 1 $ITERATIONS); do
    START=$(date +%s%N)
    curl -s http://${SERVER_IP}:3001/health > /dev/null
    END=$(date +%s%N)
    DURATION=$((($END - $START) / 1000000))
    TOTAL_TIME=$((TOTAL_TIME + DURATION))
    echo "  Request $i: ${DURATION}ms"
done
AVG_TIME=$((TOTAL_TIME / ITERATIONS))
echo "  Average: ${AVG_TIME}ms"
echo ""

# Test Web response time
echo "Testing Web response time (${ITERATIONS} requests)..."
TOTAL_TIME=0
for i in $(seq 1 $ITERATIONS); do
    START=$(date +%s%N)
    curl -s http://${SERVER_IP}:3000 > /dev/null
    END=$(date +%s%N)
    DURATION=$((($END - $START) / 1000000))
    TOTAL_TIME=$((TOTAL_TIME + DURATION))
    echo "  Request $i: ${DURATION}ms"
done
AVG_TIME=$((TOTAL_TIME / ITERATIONS))
echo "  Average: ${AVG_TIME}ms"
echo ""

# Test Nginx response time
echo "Testing Nginx response time (${ITERATIONS} requests)..."
TOTAL_TIME=0
for i in $(seq 1 $ITERATIONS); do
    START=$(date +%s%N)
    curl -s http://${SERVER_IP}/api/health > /dev/null
    END=$(date +%s%N)
    DURATION=$((($END - $START) / 1000000))
    TOTAL_TIME=$((TOTAL_TIME + DURATION))
    echo "  Request $i: ${DURATION}ms"
done
AVG_TIME=$((TOTAL_TIME / ITERATIONS))
echo "  Average: ${AVG_TIME}ms"
echo ""

# Check container resource usage
echo "=== Container Resource Usage ==="
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

echo ""
echo "=== Performance Monitoring Complete ==="
```

Save as `scripts/performance-monitor.sh` and make executable:
```bash
chmod +x scripts/performance-monitor.sh
```

## Alerting

### Current Alerting

The current deployment includes basic health checks but no automated alerting. Manual checks are required.

### Recommended Alerting Setup

#### Option 1: Simple Email Alerts

Create a script to send email alerts when services are down:

```bash
#!/bin/bash

# Alert Script for ayantaraz

SERVER_IP=202.133.91.13
EMAIL="admin@ayantaraz.ir"

# Check API
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://${SERVER_IP}:3001/health)
if [ "$API_STATUS" != "200" ]; then
    echo "API is down! Status: $API_STATUS" | mail -s "Ayantaraz Alert: API Down" $EMAIL
fi

# Check Web
WEB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://${SERVER_IP}:3000)
if [ "$WEB_STATUS" != "200" ]; then
    echo "Web is down! Status: $WEB_STATUS" | mail -s "Ayantaraz Alert: Web Down" $EMAIL
fi

# Check PostgreSQL
PG_STATUS=$(docker exec ayantaraz-postgres pg_isready -U ayantaraz 2>&1)
if ! echo "$PG_STATUS" | grep -q "accepting connections"; then
    echo "PostgreSQL is down! Status: $PG_STATUS" | mail -s "Ayantaraz Alert: PostgreSQL Down" $EMAIL
fi

# Check Redis
REDIS_STATUS=$(docker exec ayantaraz-redis redis-cli -a ayantarazRedis@2025 ping 2>&1)
if ! echo "$REDIS_STATUS" | grep -q "PONG"; then
    echo "Redis is down! Status: $REDIS_STATUS" | mail -s "Ayantaraz Alert: Redis Down" $EMAIL
fi
```

#### Option 2: Prometheus + Alertmanager (Recommended)

1. **Install Prometheus**:
```bash
docker run -d -p 9090:9090 -v /path/to/prometheus.yml:/etc/prometheus/prometheus.yml prom/prometheus
```

2. **Configure Prometheus** (`prometheus.yml`):
```yaml
scrape_configs:
  - job_name: 'ayantaraz'
    static_configs:
      - targets: ['202.133.91.13:9100']
    scrape_interval: 15s
    evaluation_interval: 15s
```

3. **Install Node Exporter** (on server):
```bash
docker run -d -p 9100:9100 prom/node-exporter
```

4. **Install Alertmanager**:
```yaml
route:
  receiver: 'email'
  group_by: ['alertname']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 3h

receivers:
- name: 'email'
  email_configs:
  - to: 'admin@ayantaraz.ir'
    from: 'alertmanager@ayantaraz.ir'
    smarthost: 'smtp.ayantaraz.ir:587'
    auth_username: 'alertmanager@ayantaraz.ir'
    auth_password: 'password'
```

#### Option 3: Grafana Cloud

1. Sign up for Grafana Cloud
2. Install Grafana Agent on server
3. Configure monitoring and alerting

## Log Management

### Current Log Management

All container logs are stored in Docker's JSON file logging driver with:
- Max size: 10MB per file
- Max files: 3 per container

### Recommended Log Management

#### Option 1: ELK Stack (Elasticsearch, Logstash, Kibana)

1. **Install Elasticsearch**:
```bash
docker run -d -p 9200:9200 -p 9300:9300 elasticsearch
```

2. **Install Logstash**:
```bash
docker run -d -p 5000:5000 logstash
```

3. **Install Kibana**:
```bash
docker run -d -p 5601:5601 kibana
```

4. **Configure Docker to use Logstash**:
```json
{
  "log-driver": "syslog",
  "log-opts": {
    "syslog-address": "tcp://localhost:5000"
  }
}
```

#### Option 2: Loki + Grafana

1. **Install Loki**:
```bash
docker run -d -p 3100:3100 grafana/loki
```

2. **Install Grafana**:
```bash
docker run -d -p 3000:3000 grafana/grafana
```

3. **Configure Docker to use Loki**:
```bash
docker run --rm -v $(pwd):/tmp grafana/loki-logcli sync --target=http://loki:3100/loki --labels=job=ayantaraz
```

## Metrics Collection

### Current Metrics

- Container resource usage (CPU, memory)
- Container health status
- Application health check endpoints

### Recommended Metrics

#### Application Metrics
- Request rate (requests/second)
- Response time (average, p50, p90, p99)
- Error rate (errors/second)
- Active users
- Database query time
- Cache hit rate

#### Infrastructure Metrics
- CPU usage (per container, total)
- Memory usage (per container, total)
- Disk usage (per container, total)
- Network I/O (per container, total)
- Disk I/O (per container, total)

#### Database Metrics
- Active connections
- Query rate
- Query time (average, p50, p90, p99)
- Cache hit rate
- Table sizes
- Index sizes

#### Redis Metrics
- Memory usage
- Commands processed (per second)
- Cache hit rate
- Connected clients
- Memory fragmentation

#### Nginx Metrics
- Request rate
- Response time (average, p50, p90, p99)
- Error rate
- Active connections
- Bandwidth usage

## Dashboards

### Recommended Dashboards

#### Application Dashboard
- API request rate
- API response time
- API error rate
- Web request rate
- Web response time
- Web error rate

#### Infrastructure Dashboard
- CPU usage (per container)
- Memory usage (per container)
- Disk usage (per container)
- Network I/O (per container)

#### Database Dashboard
- Active connections
- Query rate
- Query time
- Cache hit rate
- Table sizes

#### Redis Dashboard
- Memory usage
- Commands processed
- Cache hit rate
- Connected clients

#### Nginx Dashboard
- Request rate
- Response time
- Error rate
- Active connections
- Bandwidth usage

## Maintenance

### Log Rotation

Configure log rotation for Docker containers:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

### Metrics Retention

Configure metrics retention based on storage capacity:
- Short-term: 1 day (high resolution)
- Medium-term: 7 days (medium resolution)
- Long-term: 30 days (low resolution)

### Backup Monitoring

Monitor backup processes:
```bash
# Check backup files
ls -lh /backup/

# Check backup age
find /backup -type f -name "*.sql.gz" -mtime +7

# Check backup size
du -sh /backup/
```

## Troubleshooting

### Common Issues

#### Issue: High CPU Usage
**Diagnosis**:
```bash
# Check CPU usage by container
docker stats

# Check CPU usage by process
top
htop

# Check Node.js process
docker top ayantaraz-api
```

**Solution**:
- Identify the process using most CPU
- Check for infinite loops or inefficient code
- Optimize queries or add indexes
- Scale horizontally (add more containers)

#### Issue: High Memory Usage
**Diagnosis**:
```bash
# Check memory usage by container
docker stats

# Check memory usage by process
ps aux --sort=-%mem | head

# Check Node.js memory usage
docker exec ayantaraz-api node -e "console.log(process.memoryUsage())"
```

**Solution**:
- Identify the process using most memory
- Check for memory leaks
- Optimize memory usage
- Increase memory limits
- Scale vertically (add more memory)

#### Issue: High Disk Usage
**Diagnosis**:
```bash
# Check disk usage
df -h

# Check Docker disk usage
docker system df

# Check volume sizes
docker system df -v

# Check log sizes
du -sh /var/lib/docker/containers/*/*-json.log
```

**Solution**:
- Clean up unused containers, images, volumes
- Prune Docker system
- Increase disk space
- Configure log rotation

#### Issue: High Network Usage
**Diagnosis**:
```bash
# Check network usage
iftop
nload

# Check Docker network usage
docker network inspect ayantaraz-network

# Check connections
netstat -tuln
ss -tuln
```

**Solution**:
- Identify the source of high network usage
- Optimize API responses (compression, pagination)
- Add caching
- Increase network bandwidth

#### Issue: Slow Database Queries
**Diagnosis**:
```bash
# Check slow queries
docker exec -it ayantaraz-postgres psql -U ayantaraz -d ayantaraz -c "\n  SELECT query, total_time, calls 
  FROM pg_stat_statements 
  ORDER BY total_time DESC 
  LIMIT 10;
"

# Check active queries
docker exec -it ayantaraz-postgres psql -U ayantaraz -d ayantaraz -c "\n  SELECT query, state, now() - query_start as duration 
  FROM pg_stat_activity 
  WHERE state = 'active' 
  ORDER BY duration DESC;
"

# Check locks
docker exec -it ayantaraz-postgres psql -U ayantaraz -d ayantaraz -c "\n  SELECT locktype, relation::regclass, mode, transactionid as tid, virtualtransaction as vtid, pid, granted 
  FROM pg_locks 
  WHERE NOT granted;
"
```

**Solution**:
- Add indexes for frequently queried columns
- Optimize slow queries
- Add query caching
- Increase database resources

## Best Practices

### Monitoring Best Practices

1. **Monitor all critical services**
2. **Set appropriate alert thresholds**
3. **Monitor both metrics and logs**
4. **Use dashboards for visualization**
5. **Configure alerting for critical issues**
6. **Regularly review monitoring setup**
7. **Test alerting procedures**
8. **Document monitoring procedures**

### Alerting Best Practices

1. **Alert on critical issues only**
2. **Use different severity levels**
3. **Provide clear alert messages**
4. **Include relevant context in alerts**
5. **Escalate alerts appropriately**
6. **Avoid alert fatigue**
7. **Regularly test alerting**
8. **Document alert procedures**

### Log Management Best Practices

1. **Centralize logs**
2. **Use structured logging**
3. **Configure log rotation**
4. **Set appropriate log levels**
5. **Monitor log growth**
6. **Archive old logs**
7. **Secure log access**
8. **Regularly review logs**

---

**Last Updated**: July 2026  
**Version**: 2.0  
**Server**: 202.133.91.13
