# ayantaraz Security Documentation

## Overview

This document describes the security measures implemented in the ayantaraz project and provides guidelines for maintaining security in production.

## Security Architecture

### Authentication and Authorization

#### JWT Authentication
- **Access Token**: Short-lived (15 minutes)
- **Refresh Token**: Long-lived (7 days)
- **Token Blacklisting**: Supported for logout functionality
- **Token Storage**: HTTP-only cookies

#### Role-Based Access Control (RBAC)
- **Roles**: admin, user
- **Admin Users**: Pre-seeded with phones 09133374162, 09134292329
- **Guards**: JWT authentication guard, Roles guard

#### Session Management
- **Session Secret**: Configured via environment variable
- **Session Storage**: Server-side with Redis
- **Session Timeout**: Configurable

### Input Validation

#### Request Validation
- **DTO Validation**: Using class-validator
- **Input Sanitization**: Middleware for sanitizing user input
- **Request Validation**: Pipe for validating incoming requests

#### File Upload Validation
- **Size Limit**: 10MB maximum
- **File Types**: jpeg, png, gif, webp, pdf, txt, json
- **Checksum Verification**: File integrity check
- **Unique Filenames**: Prevent overwrites

### Rate Limiting

#### Configuration
- **Window**: 15 minutes (900,000ms)
- **Max Requests**: 100 per window
- **Fail Open**: True (allows requests when Redis is down)
- **Storage**: Redis-based

#### Implementation
- **Rate Limiter Service**: Redis-based rate limiting
- **Middleware**: Applied to all API routes
- **Configurable**: Per-route limits possible

### CSRF Protection

#### Configuration
- **Token Generation**: Unique tokens per session
- **Token Validation**: Middleware for validating CSRF tokens
- **Token Storage**: Cookies and headers

#### Endpoints
- **CSRF Token**: `/api/csrf` (GET)
- **Token Header**: `X-CSRF-Token`
- **Token Cookie**: `csrf-token`

### CORS Configuration

#### Settings
- **Allow All Origins**: True (for development)
- **Trusted Origins**: Configurable list
- **Credentials**: Supported
- **Methods**: All HTTP methods
- **Headers**: All headers

#### Production Recommendation
```
ALLOW_ALL_ORIGINS=false
TRUSTED_ORIGINS=https://ayantaraz.ir,https://www.ayantaraz.ir
```

### CAPTCHA

#### Current Status
- **Disabled**: As requested
- **Implementation**: Returns true for all validations

#### To Enable
```
# Set CAPTCHA_SECRET in .env.production
CAPTCHA_SECRET=your_captcha_secret_key

# Update captcha.service.ts to use real CAPTCHA
```

## Security Measures

### Password Security
- **Hashing**: bcrypt with salt
- **Rounds**: Configurable (default: 10)
- **Never Stored**: Plain text passwords

### File Encryption
- **Key**: Configured via environment variable
- **Algorithm**: AES-256
- **Usage**: Encrypting sensitive file data

### Cookie Security
- **HTTP-only**: True (prevents XSS attacks)
- **SameSite**: Lax (prevents CSRF attacks)
- **Secure**: False (for HTTP), True (for HTTPS)
- **Domain**: Configurable

### Database Security
- **Connection Pooling**: Configured with limits
- **SSL**: Not enabled (for local Docker network)
- **Credentials**: Environment variables
- **Access Control**: PostgreSQL user permissions

### Redis Security
- **Password**: Configured
- **Port**: Not exposed to host
- **Network**: Isolated Docker network

## Environment Variables

### Sensitive Variables

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` | Yes |
| `POSTGRES_PASSWORD` | PostgreSQL password | `ayantarazDB@2025` | Yes |
| `REDIS_PASSWORD` | Redis password | `ayantarazRedis@2025` | Yes |
| `JWT_SECRET` | JWT signing secret | `openssl rand -base64 48` | Yes |
| `JWT_REFRESH_SECRET` | JWT refresh secret | `openssl rand -base64 48` | Yes |
| `FILE_ENCRYPTION_KEY` | File encryption key | `openssl rand -base64 32` | Yes |
| `SESSION_SECRET` | Session secret | `openssl rand -base64 32` | Yes |
| `SMS_API_KEY` | SMS provider API key | `your_sms_api_key` | Yes |

### Security Variables

| Variable | Description | Default | Recommended |
|----------|-------------|---------|-------------|
| `COOKIE_SECURE` | HTTPS-only cookies | false | true (with HTTPS) |
| `COOKIE_HTTP_ONLY` | HTTP-only cookies | true | true |
| `COOKIE_SAME_SITE` | SameSite policy | lax | lax or strict |
| `ALLOW_ALL_ORIGINS` | Allow all CORS origins | true | false (production) |
| `CAPTCHA_SECRET` | CAPTCHA secret | empty | your_captcha_secret |

## Security Checklist

### Pre-Deployment
- [ ] All secrets are in environment variables (not in code)
- [ ] Database passwords are strong and unique
- [ ] JWT secrets are strong and unique
- [ ] File encryption key is strong and unique
- [ ] Session secret is strong and unique
- [ ] SMS API key is configured
- [ ] CAPTCHA is enabled (optional)
- [ ] COOKIE_SECURE is set appropriately
- [ ] ALLOW_ALL_ORIGINS is set appropriately
- [ ] TRUSTED_ORIGINS is configured

### Post-Deployment
- [ ] Server firewall is configured
- [ ] SSH access is secured
- [ ] Docker daemon is not exposed to public
- [ ] Container logs are not exposed
- [ ] Health check endpoints are secured
- [ ] Monitoring is in place
- [ ] Alerting is configured
- [ ] Backups are configured

### Production Hardening
- [ ] Enable HTTPS with valid certificate
- [ ] Configure automatic certificate renewal
- [ ] Enable HTTP/2
- [ ] Configure security headers
- [ ] Enable rate limiting
- [ ] Enable CSRF protection
- [ ] Enable CORS with trusted origins only
- [ ] Enable CAPTCHA
- [ ] Configure database backups
- [ ] Configure log rotation

## Security Headers

### Recommended Headers

```nginx
# Security headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src 'self';" always;
```

### Current Implementation
Check `infra/nginx/default.conf` for current security headers.

## Security Testing

### Manual Testing

#### Authentication Testing
```bash
# Test login with invalid credentials
curl -X POST http://202.133.91.13:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"phone": "09120000000", "password": "wrong"}'

# Test access to protected route without authentication
curl http://202.133.91.13:3001/api/users
```

#### Rate Limiting Testing
```bash
# Test rate limiting (100 requests in 15 minutes)
for i in {1..101}; do
  curl -s http://202.133.91.13:3001/api/health > /dev/null
  echo "Request $i"
done
```

#### CSRF Testing
```bash
# Test without CSRF token
curl -X POST http://202.133.91.13:3001/api/auth/otp \
  -H 'Content-Type: application/json' \
  -d '{"phone": "09120000000"}'

# Test with CSRF token
CSRF_TOKEN=$(curl -s http://202.133.91.13:3001/api/csrf | jq -r '.token')
curl -X POST http://202.133.91.13:3001/api/auth/otp \
  -H 'Content-Type: application/json' \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d '{"phone": "09120000000"}'
```

### Automated Testing

#### Security Scanning
The CI/CD pipeline includes Trivy vulnerability scanning:
- Scans filesystem for vulnerabilities
- Reports CRITICAL and HIGH severity issues
- Uploads results to GitHub Security tab

#### To Run Locally
```bash
# Install Trivy
docker run aquasec/trivy:latest --version

# Scan filesystem
docker run --rm -v $(pwd):/src aquasec/trivy:latest fs /src

# Scan Docker image
docker run --rm aquasec/trivy:latest image ghcr.io/codez37/ayantaraz-/api:latest
```

## Security Monitoring

### Log Monitoring
```bash
# Monitor API logs for security events
docker logs -f ayantaraz-api | grep -i "security\|auth\|error\|warn"

# Monitor failed login attempts
docker logs -f ayantaraz-api | grep -i "login.*failed\|authentication.*failed"

# Monitor rate limiting
docker logs -f ayantaraz-api | grep -i "rate.*limit\|too.*many.*requests"
```

### Database Monitoring
```bash
# Check for suspicious database activity
docker exec -it ayantaraz-postgres psql -U ayantaraz -d ayantaraz -c "\n  SELECT query, calls, total_time 
  FROM pg_stat_statements 
  ORDER BY total_time DESC 
  LIMIT 10;
"

# Check for failed login attempts
docker exec -it ayantaraz-postgres psql -U ayantaraz -d ayantaraz -c "\n  SELECT COUNT(*) as failed_logins 
  FROM \"AuthLog\" 
  WHERE success = false 
  AND createdAt > NOW() - INTERVAL '1 hour';
"
```

### Redis Monitoring
```bash
# Monitor Redis commands
docker exec -it ayantaraz-redis redis-cli -a ayantarazRedis@2025 MONITOR

# Check Redis memory usage
docker exec -it ayantaraz-redis redis-cli -a ayantarazRedis@2025 INFO memory

# Check Redis keys
docker exec -it ayantaraz-redis redis-cli -a ayantarazRedis@2025 KEYS "*"
```

## Incident Response

### Security Incident Procedure

1. **Detection**: Identify the security incident
2. **Containment**: Isolate affected systems
3. **Eradication**: Remove the threat
4. **Recovery**: Restore normal operations
5. **Lessons Learned**: Document and improve

### Common Incidents

#### Brute Force Attack
**Detection**: Multiple failed login attempts

**Response**:
```bash
# Block IP address (if using firewall)
ufw deny from <attacker_ip>

# Check and block in application
# Update rate limiting configuration
```

#### SQL Injection Attempt
**Detection**: Suspicious database queries

**Response**:
```bash
# Check database logs
docker logs ayantaraz-postgres

# Review application logs
docker logs ayantaraz-api | grep -i "sql\|query\|injection"

# Update input validation
```

#### XSS Attack
**Detection**: Suspicious script tags in user input

**Response**:
```bash
# Check user-generated content
docker exec -it ayantaraz-postgres psql -U ayantaraz -d ayantaraz -c "\n  SELECT * FROM \"Content\" 
  WHERE title ILIKE '%<script>%' 
  OR content ILIKE '%<script>%';
"

# Update input sanitization
```

#### Data Breach
**Detection**: Unauthorized data access

**Response**:
1. Isolate affected database
2. Rotate all secrets and passwords
3. Review access logs
4. Notify affected users
5. Investigate root cause

## Security Updates

### Dependency Updates

#### Check for Updates
```bash
# Check for outdated dependencies
pnpm outdated

# Check for security vulnerabilities
pnpm audit

# Update specific dependency
pnpm update <package_name>

# Update all dependencies
pnpm update
```

#### Docker Image Updates
```bash
# Check for updated base images
docker pull node:22-alpine
docker pull postgres:15-alpine
docker pull redis:7-alpine

# Update Dockerfiles with new base image versions
# Then rebuild images
```

### Secret Rotation

#### Rotation Procedure
1. Generate new secrets
2. Update `.env.production` with new secrets
3. Stop all containers
4. Remove old volumes (if needed)
5. Start containers with new configuration
6. Verify all services work with new secrets

#### Secret Generation
```bash
# Generate strong secrets
openssl rand -base64 48  # For JWT secrets
openssl rand -base64 32  # For encryption keys
openssl rand -base64 64  # For database passwords
```

## Security Tools

### Recommended Tools

1. **Trivy**: Vulnerability scanner
2. **Snyk**: Dependency scanning
3. **OWASP ZAP**: Web application security scanner
4. **Nmap**: Network scanning
5. **Wireshark**: Network protocol analyzer
6. **Fail2Ban**: Brute force protection

### Integration with CI/CD

The CI/CD pipeline currently includes:
- Trivy vulnerability scanning
- Quality checks (lint, typecheck, format)
- Unit tests
- Build validation

Future enhancements:
- SAST scanning (SonarQube, Semgrep)
- DAST scanning (OWASP ZAP)
- Dependency scanning (Snyk, Dependabot)
- Secret scanning (GitLeaks, TruffleHog)

## Security Policies

### Password Policy
- Minimum length: 12 characters
- Include uppercase, lowercase, numbers, special characters
- No common passwords
- Unique passwords for each service
- Regular rotation (every 90 days)

### Access Control Policy
- Principle of least privilege
- Role-based access control
- Regular access reviews
- Immediate revocation on termination

### Data Protection Policy
- Encrypt sensitive data at rest
- Encrypt sensitive data in transit
- Regular backups
- Secure backup storage
- Data retention policy

### Incident Response Policy
- Report incidents immediately
- Follow incident response procedure
- Document all actions
- Preserve evidence
- Post-incident review

## Compliance

### Standards
- OWASP Top 10
- CIS Benchmarks
- NIST Guidelines
- GDPR (if applicable)

### Checklists
- [OWASP Application Security Verification Standard (ASVS)](https://owasp.org/www-project-application-security-verification-standard/)
- [CIS Docker Benchmark](https://www.cisecurity.org/benchmark/docker/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

## Training

### Security Awareness
- Regular security training for developers
- Secure coding practices
- Phishing awareness
- Incident reporting procedures

### Secure Development
- Secure coding guidelines
- Code review checklists
- Security testing procedures
- Dependency management

## Resources

### Documentation
- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)
- [Docker Security](https://docs.docker.com/engine/security/)
- [Node.js Security](https://nodejs.org/en/docs/guides/security/)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)
- [Redis Security](https://redis.io/topics/security)

### Tools
- [Trivy](https://github.com/aquasecurity/trivy)
- [Snyk](https://snyk.io/)
- [OWASP ZAP](https://www.zaproxy.org/)
- [Nmap](https://nmap.org/)
- [Fail2Ban](https://www.fail2ban.org/)

---

**Last Updated**: July 2026  
**Version**: 2.0  
**Security Contact**: security@ayantaraz.ir (to be configured)
