import { readFileSync, readdirSync, writeFileSync, existsSync, statSync } from 'fs';
import { join, relative, dirname } from 'path';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface RouteEntry {
  method: string;
  path: string;
  controller: string;
}

interface SchemaEntry {
  models: number;
  enums: number;
  checksum: string;
}

interface ScopeSnapshot {
  timestamp: string;
  routes: RouteEntry[];
  schema: SchemaEntry;
  controllerCount: number;
  routeCount: number;
  checksum: string;
}

const API_SRC = 'apps/api/src';
const EXCLUDE_DIRS = ['orchestrator', 'architecture'];
const PRISMA_SCHEMA = 'prisma/schema.prisma';

function isControllerFile(file: string): boolean {
  return file.endsWith('.controller.ts') && !file.endsWith('.d.ts');
}

function findControllerFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.includes(entry.name)) continue;
      if (entry.name.startsWith('_') || entry.name === 'node_modules') continue;
      results.push(...findControllerFiles(full));
    } else if (isControllerFile(full)) {
      results.push(full);
    }
  }
  return results;
}

function normalizePath(p: string): string {
  return p.replace(/\\/g, '/');
}

function extractControllerPrefix(filePath: string): string {
  const content = readFileSync(filePath, 'utf-8');
  const match = content.match(/@Controller\(\s*(?:'([^']*)'|"([^"]*)")\s*\)/);
  const prefix = match?.[1] || match?.[2] || '';
  return prefix;
}

function extractRoutes(filePath: string, controllerPrefix: string): RouteEntry[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const routes: RouteEntry[] = [];
  const httpMethods = ['Get', 'Post', 'Patch', 'Delete'];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const method of httpMethods) {
      const hasExplicitPath = line.match(new RegExp(`@${method}\\(\s*(?:'([^']*)'|"([^"]*)")\\s*\\)`));
      const isEmpty = line.match(new RegExp(`@${method}\\(\s*\\)`));

      if (hasExplicitPath) {
        const routePath = hasExplicitPath[1] || hasExplicitPath[2] || '';
        const fullPath = routePath ? `${controllerPrefix}/${routePath}`.replace(/\/+/g, '/') : controllerPrefix || '/';
        routes.push({
          method: method.toUpperCase(),
          path: fullPath || '/',
          controller: normalizePath(relative(API_SRC, filePath)),
        });
      } else if (isEmpty) {
        routes.push({
          method: method.toUpperCase(),
          path: controllerPrefix || '/',
          controller: normalizePath(relative(API_SRC, filePath)),
        });
      }
    }
  }

  return routes;
}

function extractSchemaChecksum(): SchemaEntry {
  const content = readFileSync(PRISMA_SCHEMA, 'utf-8');
  const models = content.match(/^model\s+\w+/gm)?.length || 0;
  const enums = content.match(/^enum\s+\w+/gm)?.length || 0;
  const checksum = createHash('sha256').update(content).digest('hex').slice(0, 16);
  return { models, enums, checksum };
}

function buildSnapshot(): ScopeSnapshot {
  const controllerFiles = findControllerFiles(API_SRC).sort();
  const allRoutes: RouteEntry[] = [];

  for (const file of controllerFiles) {
    const prefix = extractControllerPrefix(file);
    const routes = extractRoutes(file, prefix);
    allRoutes.push(...routes);
  }

  allRoutes.sort((a, b) => `${a.method}:${a.path}`.localeCompare(`${b.method}:${b.path}`));

  const schema = extractSchemaChecksum();
  const snapshot: ScopeSnapshot = {
    timestamp: new Date().toISOString(),
    routes: allRoutes,
    schema,
    controllerCount: controllerFiles.length,
    routeCount: allRoutes.length,
    checksum: '',
  };

  const serialized = JSON.stringify({ routes: snapshot.routes, schema: snapshot.schema });
  snapshot.checksum = createHash('sha256').update(serialized).digest('hex').slice(0, 16);

  return snapshot;
}

const snapshot = buildSnapshot();
const baselinePath = join(__dirname, 'scope-baseline.json');

if (process.argv.includes('--generate')) {
  writeFileSync(baselinePath, JSON.stringify(snapshot, null, 2) + '\n');
  console.log(`✓ Baseline generated: ${baselinePath}`);
  console.log(`  Controllers: ${snapshot.controllerCount}`);
  console.log(`  Routes: ${snapshot.routeCount}`);
  console.log(`  Schema: ${snapshot.schema.models}m/${snapshot.schema.enums}e`);
  console.log(`  Checksum: ${snapshot.checksum}`);
  process.exit(0);
}

if (!existsSync(baselinePath)) {
  console.error('✗ No baseline found. Run with --generate first.');
  process.exit(1);
}

const baseline: ScopeSnapshot = JSON.parse(readFileSync(baselinePath, 'utf-8'));
const failed: string[] = [];

if (snapshot.controllerCount !== baseline.controllerCount) {
  failed.push(`Controller count: ${snapshot.controllerCount} vs baseline ${baseline.controllerCount}`);
}

if (snapshot.routeCount !== baseline.routeCount) {
  failed.push(`Route count: ${snapshot.routeCount} vs baseline ${baseline.routeCount}`);
}

if (snapshot.checksum !== baseline.checksum) {
  const baselineSet = new Set(baseline.routes.map((r) => `${r.method} ${r.path}`));
  const currentSet = new Set(snapshot.routes.map((r) => `${r.method} ${r.path}`));

  for (const r of snapshot.routes) {
    const key = `${r.method} ${r.path}`;
    if (!baselineSet.has(key)) {
      failed.push(`New route: ${r.method} ${r.path} (${r.controller})`);
    }
  }
  for (const r of baseline.routes) {
    const key = `${r.method} ${r.path}`;
    if (!currentSet.has(key)) {
      failed.push(`Missing route: ${r.method} ${r.path} (${r.controller})`);
    }
  }

  if (snapshot.schema.checksum !== baseline.schema.checksum) {
    failed.push(`Schema changed: ${snapshot.schema.checksum} vs baseline ${baseline.schema.checksum}`);
  }
}

console.log('=== SCOPE VALIDATION ===');
console.log(`Timestamp: ${snapshot.timestamp}`);
console.log(`Controllers: ${snapshot.controllerCount} (baseline: ${baseline.controllerCount})`);
console.log(`Routes: ${snapshot.routeCount} (baseline: ${baseline.routeCount})`);
console.log(
  `Schema: ${snapshot.schema.models}m/${snapshot.schema.enums}e (baseline: ${baseline.schema.models}m/${baseline.schema.enums}e)`,
);
console.log(`Checksum: ${snapshot.checksum}${snapshot.checksum === baseline.checksum ? ' ✓' : ' ✗'}`);
console.log('');

if (failed.length > 0) {
  console.log(`FAILED (${failed.length}):`);
  for (const f of failed) {
    console.log(`  ✗ ${f}`);
  }
  console.log('');
  console.log('SCOPE VALIDATION FAILED — scope drift detected');
  console.log('Run: npx tsx scripts/scope-snapshot.ts --generate (only if drift is intentional)');
  process.exit(1);
}

console.log('SCOPE VALIDATION PASSED — no scope drift');
process.exit(0);
