# Security and Fault Tolerance Implementation

## Overview

This document describes the security improvements and fault tolerance mechanisms implemented in the Ayantaraz API to address the critical issues identified in the production readiness analysis.

---

## 1. Fault Tolerance Improvements

### 1.1 Circuit Breaker Pattern

The Circuit Breaker pattern has been implemented to prevent cascading failures and provide graceful degradation when external services fail.

#### Implementation Details

- **CircuitBreakerService**: Generic circuit breaker service that can be used for any operation
- **DatabaseCircuitBreakerService**: Specialized circuit breaker for database operations
- **RedisCircuitBreakerService**: Specialized circuit breaker for Redis operations

#### Configuration

```typescript
// In app.module.ts
CircuitBreakerModule.forRoot({
  failureThreshold: 5,      // Open circuit after 5 failures
  recoveryTimeout: 30000,   // Wait 30 seconds before trying again
  successThreshold: 2,      // Close circuit after 2 successes in HALF_OPEN state
  autoRecover: true,        // Enable automatic recovery
})
```

#### Circuit States

1. **CLOSED**: Normal operation, requests flow through
2. **OPEN**: Circuit is broken, requests fail fast or use fallback
3. **HALF_OPEN**: Testing if service has recovered, limited requests allowed

#### Usage Examples

```typescript
// Using the circuit breaker service directly
constructor(private readonly circuitBreaker: CircuitBreakerService) {}

async getData() {
  const result = await this.circuitBreaker.execute(
    'database',
    async () => {
      return this.prisma.user.findMany();
    },
    [] // Fallback: empty array if database is down
  );

  return result.data;
}
```

```typescript
// Using the decorator
@CircuitBreaker({ 
  circuitName: 'user-service',
  fallback: [] 
})
@Get('/users')
async getUsers() {
  return this.userService.findAll();
}
```

### 1.2 Fallback Mechanisms

The FallbackService provides various fallback strategies for different scenarios:

```typescript
// Database fallback
const users = this.fallbackService.databaseFallback([], cachedUsers);

// Cache fallback
const cachedData = this.fallbackService.cacheFallback(defaultData);

// SMS service fallback
const smsResult = this.fallbackService.smsFallback(phone, message);

// Retry with fallback
const result = await this.fallbackService.retryWithFallback(
  () => this.externalService.call(),
  3,        // max retries
  1000,     // delay between retries
  defaultValue
);
```

### 1.3 Health Check Integration

The health check endpoint now includes circuit breaker statistics:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 12345.678,
  "checks": {
    "database": {
      "status": "up",
      "responseTime": 5,
      "circuit": {
        "state": "CLOSED",
        "failures": 0,
        "successes": 100,
        "lastFailure": null,
        "lastSuccess": "2024-01-01T00:00:00.000Z"
      }
    },
    "cache": {
      "status": "up",
      "responseTime": 2
    },
    "memory": {
      "status": "ok",
      "used": 1073741824,
      "total": 4294967296,
      "usagePercent": 25.0
    }
  },
  "circuits": {
    "database": { ... },
    "redis": { ... },
    "external-api": { ... }
  },
  "version": "1.0.0"
}
```

---

## 2. Security Improvements

### 2.1 SQL Injection Protection

**Problem**: Raw SQL queries with string concatenation were vulnerable to SQL injection.

**Solution**: 

1. **Use Prisma ORM methods** instead of raw queries:
   ```typescript
   // ✅ Safe
   async getUserByEmail(email: string) {
     return this.prisma.user.findUnique({
       where: { email },
     });
   }
   ```

2. **Use parameterized queries** when raw SQL is necessary:
   ```typescript
   // ✅ Safe
   async getUserByEmail(email: string) {
     return this.prisma.$queryRaw(
       Prisma.sql`SELECT * FROM users WHERE email = ${email}`
     );
   }
   ```

3. **Never use string concatenation** in SQL queries:
   ```typescript
   // ❌ Dangerous - SQL Injection vulnerability
   async getUserByEmail(email: string) {
     return this.prisma.$queryRaw(`SELECT * FROM users WHERE email = '${email}'`);
   }
   ```

### 2.2 XSS (Cross-Site Scripting) Protection

**Problem**: User input was not sanitized, allowing XSS attacks.

**Solution**:

1. **XSS Protection Middleware**: Automatically sanitizes all request inputs
   - Sanitizes query parameters
   - Sanitizes request body
   - Sanitizes URL parameters
   - Sanitizes headers (except for known safe headers)

2. **Input Sanitization**: Uses the `validator` library to escape HTML entities
   ```typescript
   import { escape } from 'validator';
   
   const safeInput = escape(userInput);
   ```

3. **Output Encoding**: The web application uses DOMPurify for HTML sanitization
   ```typescript
   import DOMPurify from 'isomorphic-dompurify';
   
   const safeHtml = DOMPurify.sanitize(userGeneratedContent);
   ```

4. **Content Security Policy (CSP)**: Added to production configuration
   ```yaml
   # In docker-compose.production.yml
   - CSP_DEFAULT_SRC="'self'"
   - CSP_SCRIPT_SRC="'self' 'unsafe-inline' https://cdn.jsdelivr.net"
   - CSP_STYLE_SRC="'self' 'unsafe-inline' https://cdn.jsdelivr.net"
   - CSP_IMG_SRC="'self' data: https://cdn.jsdelivr.net"
   - CSP_CONNECT_SRC="'self' http://202.133.91.13:3001 https://202.133.91.13"
   - CSP_FRAME_SRC="'none'"
   - CSP_OBJECT_SRC="'none'"
   ```

### 2.3 CSRF (Cross-Site Request Forgery) Protection

**Problem**: CSRF protection was only enabled in production, and cookie-based authentication could be vulnerable.

**Solution**:

1. **CSRF Tokens**: Already implemented in the application
   - Tokens are generated and set in HTTP-only, secure cookies
   - Tokens are validated on state-changing requests
   - CSRF protection is enabled in production

2. **SameSite Cookies**: All cookies use `SameSite=lax` or `SameSite=strict`

3. **CSRF Controller**: Provides endpoints for obtaining CSRF tokens
   ```typescript
   @Get('/csrf')
   getCsrfToken(@Res() res: Response): void {
     const token = crypto.randomBytes(32).toString('hex');
     res.cookie(CSRF_COOKIE_NAME, token, {
       httpOnly: true,
       secure: process.env.NODE_ENV === 'production',
       sameSite: 'strict',
       maxAge: CSRF_COOKIE_MAX_AGE,
       path: '/',
     });
     res.json({ token, headerName: CSRF_HEADER_NAME, cookieName: CSRF_COOKIE_NAME });
   }
   ```

### 2.4 JWT Secret Security

**Problem**: JWT secrets had fallback values that could be exploited.

**Solution**:

1. **Removed fallback values**: JWT secrets now must be explicitly configured
   ```typescript
   // Before (❌ Vulnerable)
   secret: process.env.JWT_SECRET || 'secret',
   
   // After (✅ Secure)
   secret: process.env.JWT_SECRET,
   ```

2. **Validation at startup**: The application validates that required secrets are present
   ```typescript
   constructor() {
     if (!process.env.JWT_SECRET) {
       throw new Error('JWT_SECRET environment variable is required');
     }
     if (!process.env.JWT_REFRESH_SECRET) {
       throw new Error('JWT_REFRESH_SECRET environment variable is required');
     }
     if (process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) {
       throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be different');
     }
   }
   ```

---

## 3. Implementation Checklist

### Fault Tolerance

- [x] Circuit Breaker pattern implemented
- [x] Fallback mechanisms for critical services
- [x] Health check integration with circuit breaker stats
- [x] Database circuit breaker service
- [x] Redis circuit breaker service
- [x] Generic circuit breaker service
- [x] Circuit breaker decorator for controllers
- [x] Circuit breaker interceptor

### Security

- [x] SQL injection protection (Prisma ORM usage)
- [x] XSS protection middleware
- [x] Input sanitization with validator library
- [x] Output encoding with DOMPurify
- [x] Content Security Policy headers
- [x] CSRF protection enabled
- [x] JWT secret fallback removed
- [x] JWT secret validation at startup

---

## 4. Usage Examples

### Using Circuit Breaker in Services

```typescript
import { Injectable } from '@nestjs/common';
import { CircuitBreakerService } from '../common/circuit-breaker/circuit-breaker.service';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {}

  async findAll() {
    const result = await this.circuitBreaker.execute(
      'user-service.findAll',
      async () => {
        return this.prisma.user.findMany();
      },
      [] // Fallback: empty array
    );

    if (result.isFallback) {
      this.logger.warn('Using fallback for user list');
    }

    return result.data;
  }
}
```

### Using Fallback Service

```typescript
import { Injectable } from '@nestjs/common';
import { FallbackService } from '../common/fallback/fallback.service';

@Injectable()
export class ExternalApiService {
  constructor(private readonly fallbackService: FallbackService) {}

  async fetchData() {
    return this.fallbackService.retryWithFallback(
      () => this.httpService.get('https://api.example.com/data').toPromise(),
      3,        // max retries
      1000,     // delay between retries
      { data: [] } // fallback value
    );
  }
}
```

### Using Circuit Breaker Decorator

```typescript
import { Controller, Get } from '@nestjs/common';
import { CircuitBreaker } from '../common/decorators/circuit-breaker.decorator';

@Controller('users')
export class UserController {
  @CircuitBreaker({
    circuitName: 'user-controller.findAll',
    fallback: []
  })
  @Get()
  async findAll() {
    return this.userService.findAll();
  }
}
```

---

## 5. Testing

### Circuit Breaker Tests

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { CircuitBreakerService } from './circuit-breaker.service';

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: CircuitBreakerService,
          useValue: new CircuitBreakerService({
            failureThreshold: 3,
            recoveryTimeout: 1000,
            successThreshold: 2,
          }),
        },
      ],
    }).compile();

    service = module.get<CircuitBreakerService>(CircuitBreakerService);
  });

  it('should start in CLOSED state', () => {
    const stats = service.getStats('test');
    expect(stats.state).toBe('CLOSED');
  });

  it('should open circuit after failure threshold', async () => {
    let callCount = 0;
    
    // Create a failing operation
    const failingOperation = async () => {
      callCount++;
      throw new Error('Test error');
    };

    // Execute multiple times to reach failure threshold
    for (let i = 0; i < 3; i++) {
      await service.execute('test', failingOperation);
    }

    const stats = service.getStats('test');
    expect(stats.state).toBe('OPEN');
    expect(stats.failures).toBe(3);
  });

  it('should use fallback when circuit is open', async () => {
    // First, open the circuit
    service.open('test');

    const result = await service.execute(
      'test',
      async () => { throw new Error('Should not be called'); },
      'fallback-value'
    );

    expect(result.success).toBe(true);
    expect(result.data).toBe('fallback-value');
    expect(result.isFallback).toBe(true);
  });
});
```

### XSS Protection Tests

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { XssProtectionMiddleware } from './xss-protection.middleware';

describe('XssProtectionMiddleware', () => {
  let middleware: XssProtectionMiddleware;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [XssProtectionMiddleware],
    }).compile();

    middleware = module.get<XssProtectionMiddleware>(XssProtectionMiddleware);
  });

  it('should sanitize XSS in query parameters', () => {
    const req = {
      query: { search: '<script>alert("XSS")</script>' },
      body: {},
      params: {},
      headers: {},
    };
    const res = {};
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.query.search).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
    expect(next).toHaveBeenCalled();
  });
});
```

---

## 6. Monitoring and Alerting

### Health Check Endpoints

- **GET /health**: Full health check with circuit breaker stats
- **GET /health/ping**: Simple ping to check if service is alive
- **GET /health/ready**: Readiness check for Kubernetes
- **GET /health/database**: Database connectivity check
- **GET /health/metrics**: Application metrics

### Circuit Breaker Metrics

The health check endpoint includes:
- Circuit state (CLOSED, OPEN, HALF_OPEN)
- Number of failures
- Number of successes
- Last failure timestamp
- Last success timestamp
- Next attempt timestamp (when in OPEN state)

### Logging

All circuit breaker events are logged:
- Circuit state changes
- Fallback usage
- Recovery attempts
- Failures and successes

---

## 7. Deployment Considerations

### Environment Variables

Ensure the following environment variables are set in production:

```bash
# JWT Secrets (required)
JWT_SECRET=your-strong-secret-key
JWT_REFRESH_SECRET=your-strong-refresh-secret-key

# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Security
COOKIE_SECURE=true
COOKIE_HTTP_ONLY=true
COOKIE_SAME_SITE=lax
ALLOW_ALL_ORIGINS=false
```

### Docker Configuration

The production docker-compose file includes:
- CSP headers for security
- Secure cookie settings
- Health checks for all services
- Proper network isolation

---

## 8. Migration Guide

### For Existing Services

1. **Import the CircuitBreakerService** in your service:
   ```typescript
   import { CircuitBreakerService } from '../common/circuit-breaker/circuit-breaker.service';
   ```

2. **Wrap critical operations** with circuit breaker:
   ```typescript
   async getData() {
     return this.circuitBreaker.execute(
       'your-service.getData',
       async () => this.prisma.data.findMany(),
       [] // fallback
     );
   }
   ```

3. **Add XSS middleware** to your application (already done in app.module.ts)

4. **Update SQL queries** to use Prisma ORM methods or parameterized queries

5. **Remove JWT secret fallbacks** and ensure secrets are properly configured

### For New Services

1. Use the circuit breaker pattern for all external service calls
2. Always sanitize user input using the XSS protection middleware
3. Use Prisma ORM methods instead of raw SQL queries
4. Implement proper fallback mechanisms for critical operations
5. Add health checks with circuit breaker integration

---

## 9. Troubleshooting

### Circuit Breaker Issues

**Problem**: Circuit stays OPEN even after service recovers

**Solution**: 
- Check the recovery timeout setting
- Verify that the service is actually healthy
- Manually reset the circuit using `circuitBreaker.reset('circuit-name')`

**Problem**: Circuit breaker not triggering fallback

**Solution**:
- Ensure the fallback parameter is provided
- Check that the circuit name is consistent
- Verify that the failure threshold is being reached

### Security Issues

**Problem**: XSS vulnerability detected

**Solution**:
- Ensure XSS protection middleware is applied to all routes
- Check that all user input is properly sanitized
- Verify that output is properly encoded

**Problem**: SQL injection vulnerability detected

**Solution**:
- Replace all raw SQL queries with Prisma ORM methods
- Use parameterized queries with `Prisma.sql` for raw SQL
- Never use string concatenation in SQL queries

---

## 10. References

- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [NestJS Documentation](https://docs.nestjs.com/)
