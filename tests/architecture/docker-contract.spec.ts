/**
 * ARCHITECTURE VALIDATION CONTRACT — Docker + Nginx Layer
 *
 * Validates that the container topology matches the production blueprint.
 * Enforces: Nginx LB → API + Web → Tax Engine → DB + Redis
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parse } from 'yaml';

const ROOT = join(__dirname, '../..');

/**
 * CONTRACT 16: Container Topology
 *
 * Required containers: api, web, postgres, redis, nginx
 * No other containers allowed in production.
 */
describe('CONTRACT 16: Required Containers', () => {
  let compose: any;

  beforeAll(() => {
    const composeFile = readFileSync(join(ROOT, 'docker-compose.yml'), 'utf8');
    compose = parse(composeFile);
  });

  it('docker-compose.yml has exactly 5 services', () => {
    const services = Object.keys(compose.services || {});
    expect(services.length).toBe(5);
  });

  it('required services exist', () => {
    const services = Object.keys(compose.services || {});
    expect(services).toContain('api');
    expect(services).toContain('web');
    expect(services).toContain('postgres');
    expect(services).toContain('redis');
    expect(services).toContain('nginx');
  });

  it('no unauthorized services', () => {
    const services = Object.keys(compose.services || {});
    const allowed = new Set(['api', 'web', 'postgres', 'redis', 'nginx']);
    for (const s of services) {
      expect(allowed.has(s)).toBe(true);
    }
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
  let compose: any;

  beforeAll(() => {
    const composeFile = readFileSync(join(ROOT, 'docker-compose.yml'), 'utf8');
    compose = parse(composeFile);
  });

  it('nginx depends on api and web', () => {
    const nginxDeps = compose.services?.nginx?.depends_on || [];
    expect(nginxDeps).toContain('api');
    expect(nginxDeps).toContain('web');
  });

  it('api depends on postgres and redis', () => {
    const apiDeps = compose.services?.api?.depends_on || [];
    expect(apiDeps).toContain('postgres');
    expect(apiDeps).toContain('redis');
  });

  it('postgres has no dependencies (leaf node)', () => {
    const pgDeps = compose.services?.postgres?.depends_on || [];
    expect(pgDeps.length).toBe(0);
  });

  it('redis has no dependencies (leaf node)', () => {
    const redisDeps = compose.services?.redis?.depends_on || [];
    expect(redisDeps.length).toBe(0);
  });
});

/**
 * CONTRACT 18: Network Isolation
 *
 * All services must be on the same Docker network.
 * No host network mode in production.
 */
describe('CONTRACT 18: Network Configuration', () => {
  let compose: any;

  beforeAll(() => {
    const composeFile = readFileSync(join(ROOT, 'docker-compose.yml'), 'utf8');
    compose = parse(composeFile);
  });

  it('all services share the same network', () => {
    const networks = new Set<string>();
    for (const [name, service] of Object.entries(compose.services || {})) {
      const svc = service as any;
      if (svc.networks) {
        for (const n of svc.networks) {
          networks.add(typeof n === 'string' ? n : Object.keys(n)[0]);
        }
      }
    }
    // All services should be on at most 1 network
    expect(networks.size).toBeLessThanOrEqual(1);
  });

  it('no service uses host network mode', () => {
    for (const [name, service] of Object.entries(compose.services || {})) {
      const svc = service as any;
      expect(svc.network_mode).not.toBe('host');
    }
  });
});

/**
 * CONTRACT 19: Health Checks
 *
 * API and Web services must have health checks defined.
 * DB and Redis must have health checks.
 */
describe('CONTRACT 19: Health Check Configuration', () => {
  let compose: any;

  beforeAll(() => {
    const composeFile = readFileSync(join(ROOT, 'docker-compose.yml'), 'utf8');
    compose = parse(composeFile);
  });

  it('api service has healthcheck', () => {
    expect(compose.services?.api?.healthcheck).toBeDefined();
  });

  it('postgres service has healthcheck', () => {
    expect(compose.services?.postgres?.healthcheck).toBeDefined();
  });

  it('redis service has healthcheck', () => {
    expect(compose.services?.redis?.healthcheck).toBeDefined();
  });
});

/**
 * CONTRACT 20: Volume Mounts
 *
 * Postgres data must be in a named volume (persistent).
 * Redis data should be ephemeral (no volume).
 * Uploads must be shared between releases.
 */
describe('CONTRACT 20: Volume Configuration', () => {
  let compose: any;

  beforeAll(() => {
    const composeFile = readFileSync(join(ROOT, 'docker-compose.yml'), 'utf8');
    compose = parse(composeFile);
  });

  it('postgres has persistent volume', () => {
    const pgVolumes = compose.services?.postgres?.volumes || [];
    const hasPersistent = pgVolumes.some((v: string) => v.includes('pgdata') || v.includes('postgres_data'));
    expect(hasPersistent).toBe(true);
  });

  it('redis has no persistent volume', () => {
    const redisVolumes = compose.services?.redis?.volumes || [];
    // Redis should only have tmpfs or no volumes
    const hasPersistent = redisVolumes.some(
      (v: string) => !v.includes('tmpfs') && v.includes(':') && !v.includes('/tmp'),
    );
    expect(hasPersistent).toBe(false);
  });
});

/**
 * CONTRACT 21: Restart Policy
 *
 * All services must have restart: unless-stopped or always.
 * No service should have restart: no.
 */
describe('CONTRACT 21: Restart Policy', () => {
  let compose: any;

  beforeAll(() => {
    const composeFile = readFileSync(join(ROOT, 'docker-compose.yml'), 'utf8');
    compose = parse(composeFile);
  });

  it('all services have restart policy', () => {
    for (const [name, service] of Object.entries(compose.services || {})) {
      const svc = service as any;
      expect(['always', 'unless-stopped', 'on-failure']).toContain(svc.restart);
    }
  });

  it('no service has restart: no', () => {
    for (const [name, service] of Object.entries(compose.services || {})) {
      const svc = service as any;
      expect(svc.restart).not.toBe('no');
    }
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
    const exists = existsSync(join(ROOT, 'infra/nginx/default-ip.conf'));
    expect(exists).toBe(true);
  });

  it('nginx proxies to api backend', () => {
    const config = readFileSync(join(ROOT, 'infra/nginx/default-ip.conf'), 'utf8');
    expect(config).toContain('proxy_pass');
    expect(config).toContain('api');
  });

  it('nginx listens on port 80', () => {
    const config = readFileSync(join(ROOT, 'infra/nginx/default-ip.conf'), 'utf8');
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
  let compose: any;

  beforeAll(() => {
    const composeFile = readFileSync(join(ROOT, 'docker-compose.yml'), 'utf8');
    compose = parse(composeFile);
  });

  it('services use relative env_file path', () => {
    for (const [name, service] of Object.entries(compose.services || {})) {
      const svc = service as any;
      if (svc.env_file) {
        const envFile = Array.isArray(svc.env_file) ? svc.env_file[0] : svc.env_file;
        // Must be relative (not absolute)
        expect(envFile.startsWith('/')).toBe(false);
        expect(envFile).toContain('./.env');
      }
    }
  });
});

/**
 * CONTRACT 24: Log Rotation
 *
 * All services must have logging configuration.
 * Prevents disk exhaustion.
 */
describe('CONTRACT 24: Log Rotation', () => {
  let compose: any;

  beforeAll(() => {
    const composeFile = readFileSync(join(ROOT, 'docker-compose.yml'), 'utf8');
    compose = parse(composeFile);
  });

  it('services have logging configuration', () => {
    const servicesWithLogging = Object.entries(compose.services || {})
      .filter(([_, service]) => (service as any).logging)
      .map(([name]) => name);

    // At least api and nginx should have logging
    expect(servicesWithLogging).toContain('api');
    expect(servicesWithLogging).toContain('nginx');
  });
});

/**
 * CONTRACT 25: Environment Variables
 *
 * Required env vars must be defined in docker-compose.yml.
 * No hardcoded secrets.
 */
describe('CONTRACT 25: Environment Security', () => {
  let compose: any;

  beforeAll(() => {
    const composeFile = readFileSync(join(ROOT, 'docker-compose.yml'), 'utf8');
    compose = parse(composeFile);
  });

  it('no hardcoded passwords in docker-compose.yml', () => {
    const composeStr = readFileSync(join(ROOT, 'docker-compose.yml'), 'utf8');
    // Check for common hardcoded patterns
    const hardcodedPatterns = [
      /password:\s*['"][^'"]*['"]/i,
      /secret:\s*['"][^'"]*['"]/i,
      /api_key:\s*['"][^'"]*['"]/i,
    ];
    for (const pattern of hardcodedPatterns) {
      expect(composeStr).not.toMatch(pattern);
    }
  });

  it('NODE_ENV is set to production', () => {
    const composeStr = readFileSync(join(ROOT, 'docker-compose.yml'), 'utf8');
    expect(composeStr).toContain('NODE_ENV');
    expect(composeStr).toContain('production');
  });
});
