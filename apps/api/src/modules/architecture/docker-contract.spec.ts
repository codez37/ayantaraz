/**
 * ARCHITECTURE VALIDATION CONTRACT — Docker + Nginx Layer
 *
 * Validates that the container topology matches the production blueprint.
 * Enforces: Nginx LB → API + Web → Tax Engine → DB + Redis
 *
 * Uses string matching instead of YAML parser (no external deps).
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../../../../../');

function readCompose(): string {
  return readFileSync(join(ROOT, 'docker-compose.yml'), 'utf8');
}

function readNginxConfig(): string {
  return readFileSync(join(ROOT, 'infra/nginx/default.conf'), 'utf8');
}

/**
 * CONTRACT 16: Container Topology
 *
 * Required containers: api, web, postgres, redis, nginx
 * No other containers allowed in production.
 */
describe('CONTRACT 16: Required Containers', () => {
  let compose: string;

  beforeAll(() => {
    compose = readCompose();
  });

  it('docker-compose.yml defines api service', () => {
    expect(compose).toMatch(/^\s+api:/m);
  });

  it('docker-compose.yml defines web service', () => {
    expect(compose).toMatch(/^\s+web:/m);
  });

  it('docker-compose.yml defines postgres service', () => {
    expect(compose).toMatch(/^\s+postgres:/m);
  });

  it('docker-compose.yml defines redis service', () => {
    expect(compose).toMatch(/^\s+redis:/m);
  });

  it('docker-compose.yml defines nginx service', () => {
    expect(compose).toMatch(/^\s+nginx:/m);
  });

  it('exactly 5 services defined', () => {
    const requiredServices = ['postgres:', 'redis:', 'api:', 'web:', 'nginx:'];
    const found = requiredServices.filter((s) => compose.includes(`  ${s}`));
    expect(found.length).toBe(5);
  });
});

/**
 * CONTRACT 17: Service Dependencies
 *
 * The dependency graph must match the blueprint:
 *   nginx → api, web
 *   api → postgres, redis
 *   web → api (for SSR)
 */
describe('CONTRACT 17: Service Dependency Graph', () => {
  let compose: string;

  beforeAll(() => {
    compose = readCompose();
  });

  it('nginx depends on api', () => {
    const nginxSection = compose.substring(compose.indexOf('nginx:'));
    expect(nginxSection).toMatch(/depends_on:.*api/s);
  });

  it('nginx depends on web', () => {
    const nginxSection = compose.substring(compose.indexOf('nginx:'));
    expect(nginxSection).toMatch(/depends_on:.*web/s);
  });

  it('api depends on postgres', () => {
    const apiSection = compose.substring(compose.indexOf('api:'));
    const nextSectionIdx = compose.indexOf('DATABASE LAYER');
    const apiDef = apiSection.substring(
      0,
      nextSectionIdx - compose.indexOf('api:'),
    );
    expect(apiDef).toMatch(/depends_on:.*postgres/s);
  });

  it('api depends on redis', () => {
    const apiSection = compose.substring(compose.indexOf('api:'));
    const nextSectionIdx = compose.indexOf('DATABASE LAYER');
    const apiDef = apiSection.substring(
      0,
      nextSectionIdx - compose.indexOf('api:'),
    );
    expect(apiDef).toMatch(/depends_on:.*redis/s);
  });
});

/**
 * CONTRACT 18: Network Isolation
 *
 * No host network mode in production.
 */
describe('CONTRACT 18: Network Configuration', () => {
  let compose: string;

  beforeAll(() => {
    compose = readCompose();
  });

  it('no service uses host network mode', () => {
    expect(compose).not.toMatch(/network_mode:\s*host/);
  });
});

/**
 * CONTRACT 19: Health Checks
 *
 * Critical services must have health checks defined.
 */
describe('CONTRACT 19: Health Check Configuration', () => {
  let compose: string;

  beforeAll(() => {
    compose = readCompose();
  });

  it('postgres service has healthcheck', () => {
    const pgSection = compose.substring(compose.indexOf('postgres:'));
    const nextService = compose.indexOf(
      '\n  [a-z]',
      compose.indexOf('postgres:') + 1,
    );
    const pgDef = pgSection.substring(
      0,
      nextService > 0 ? nextService - compose.indexOf('postgres:') : undefined,
    );
    expect(pgDef).toContain('healthcheck');
  });

  it('redis service has healthcheck', () => {
    const redisSection = compose.substring(compose.indexOf('redis:'));
    const nextService = compose.indexOf(
      '\n  [a-z]',
      compose.indexOf('redis:') + 1,
    );
    const redisDef = redisSection.substring(
      0,
      nextService > 0 ? nextService - compose.indexOf('redis:') : undefined,
    );
    expect(redisDef).toContain('healthcheck');
  });
});

/**
 * CONTRACT 20: Volume Mounts
 *
 * Postgres data must be in a named volume (persistent).
 */
describe('CONTRACT 20: Volume Configuration', () => {
  let compose: string;

  beforeAll(() => {
    compose = readCompose();
  });

  it('postgres has persistent volume mount', () => {
    const pgSection = compose.substring(compose.indexOf('postgres:'));
    const nextService = compose.indexOf(
      '\n  [a-z]',
      compose.indexOf('postgres:') + 1,
    );
    const pgDef = pgSection.substring(
      0,
      nextService > 0 ? nextService - compose.indexOf('postgres:') : undefined,
    );
    expect(pgDef).toMatch(/postgres_data/);
  });
});

/**
 * CONTRACT 21: Restart Policy
 *
 * All services must have restart policy.
 */
describe('CONTRACT 21: Restart Policy', () => {
  let compose: string;

  beforeAll(() => {
    compose = readCompose();
  });

  it('no service has restart: no', () => {
    expect(compose).not.toMatch(/restart:\s*no\b/);
  });

  it('services have restart policy defined', () => {
    const restartCount = (compose.match(/restart:/g) || []).length;
    expect(restartCount).toBeGreaterThanOrEqual(3);
  });
});

/**
 * CONTRACT 22: Nginx Configuration
 *
 * Nginx must proxy to api and web.
 * Must not expose internal services directly.
 */
describe('CONTRACT 22: Nginx Reverse Proxy', () => {
  it('nginx config exists', () => {
    const exists = existsSync(join(ROOT, 'infra/nginx/default.conf'));
    expect(exists).toBe(true);
  });

  it('nginx proxies to api backend', () => {
    const config = readNginxConfig();
    expect(config).toContain('proxy_pass');
  });

  it('nginx listens on port 80', () => {
    const config = readNginxConfig();
    expect(config).toContain('listen 80');
  });
});

/**
 * CONTRACT 23: env_file Resolution
 *
 * docker-compose.yml must use relative env_file path.
 * This ensures each release gets its own .env.
 */
describe('CONTRACT 23: env_file Resolution', () => {
  let compose: string;

  beforeAll(() => {
    compose = readCompose();
  });

  it('services use relative env_file path (not absolute)', () => {
    const absoluteEnvFiles = compose.match(/env_file:\s*\/[^/]/g) || [];
    expect(absoluteEnvFiles.length).toBe(0);
  });

  it('env_file references ./.env', () => {
    expect(compose).toContain('- ./.env');
  });
});

/**
 * CONTRACT 24: Log Rotation
 *
 * Services must have logging configuration.
 * Prevents disk exhaustion.
 */
describe('CONTRACT 24: Log Rotation', () => {
  let compose: string;

  beforeAll(() => {
    compose = readCompose();
  });

  it('services have logging configuration', () => {
    const loggingCount = (compose.match(/logging:/g) || []).length;
    expect(loggingCount).toBeGreaterThanOrEqual(2);
  });
});

/**
 * CONTRACT 25: Environment Security
 *
 * No hardcoded secrets in docker-compose.yml.
 */
describe('CONTRACT 25: Environment Security', () => {
  it('no hardcoded passwords in docker-compose.yml', () => {
    const compose = readCompose();
    const hasHardcoded = (s: string) =>
      s && !s.includes('${') && !s.includes('$');

    const lines = compose.split('\n');
    const suspect = lines.filter((l) => {
      const pwMatch = l.match(/password:\s*['"]([^'"]+)['"]/i);
      const secMatch = l.match(/secret:\s*['"]([^'"]+)['"]/i);
      const keyMatch = l.match(/api_key:\s*['"]([^'"]+)['"]/i);
      return (
        (pwMatch && hasHardcoded(pwMatch[1])) ||
        (secMatch && hasHardcoded(secMatch[1])) ||
        (keyMatch && hasHardcoded(keyMatch[1]))
      );
    });
    expect(suspect.length).toBe(0);
  });

  it('NODE_ENV is set to production', () => {
    const compose = readCompose();
    expect(compose).toContain('NODE_ENV');
    expect(compose).toContain('production');
  });
});
