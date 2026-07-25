import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';

const CheckResult = z.object({
  name: z.string(),
  passed: z.boolean(),
  message: z.string(),
});

const ValidationReport = z.object({
  timestamp: z.string(),
  passed: z.number(),
  failed: z.number(),
  checks: z.array(CheckResult),
  safe: z.boolean(),
});

type CheckResult = z.infer<typeof CheckResult>;
type ValidationReport = z.infer<typeof ValidationReport>;

function check(name: string, condition: boolean, message: string): CheckResult {
  return { name, passed: condition, message };
}

function exists(p: string): boolean {
  return fs.existsSync(path.resolve(p));
}

function isDir(p: string): boolean {
  try {
    return fs.statSync(path.resolve(p)).isDirectory();
  } catch {
    return false;
  }
}

function isFile(p: string): boolean {
  try {
    return fs.statSync(path.resolve(p)).isFile();
  } catch {
    return false;
  }
}

function hasNoExtension(dir: string, ext: string): boolean {
  if (!isDir(dir)) return true;
  const files = fs.readdirSync(path.resolve(dir), { recursive: true });
  return !files.some((f) => {
    if (typeof f !== 'string') return false;
    if (!f.endsWith(ext)) return false;
    if (ext === '.ts' && f.endsWith('.d.ts')) return false;
    return true;
  });
}

function hasNoPattern(dir: string, pattern: RegExp): boolean {
  if (!isDir(dir)) return true;
  const files = fs.readdirSync(path.resolve(dir), { recursive: true });
  const jsFiles = files.filter((f) => typeof f === 'string' && f.endsWith('.js'));
  for (const file of jsFiles) {
    const content = fs.readFileSync(path.resolve(dir, file), 'utf-8');
    if (pattern.test(content)) return false;
  }
  return true;
}

function validate(): ValidationReport {
  const checks: CheckResult[] = [];

  // ── 1. Artifact Existence ──
  checks.push(check('shared/dist/ exists', isDir('packages/shared/dist'), 'packages/shared/dist must be a directory'));
  checks.push(check('shared/dist/index.js exists', isFile('packages/shared/dist/index.js'), 'missing index.js'));
  checks.push(check('shared/dist/index.d.ts exists', isFile('packages/shared/dist/index.d.ts'), 'missing index.d.ts'));
  checks.push(check('api/dist/ exists', isDir('apps/api/dist'), 'apps/api/dist must be a directory'));
  checks.push(check('api/dist/main.js exists', isFile('apps/api/dist/main.js'), 'missing main.js'));

  // ── 2. Source Code Boundary ──
  checks.push(
    check('shared/dist has no .ts files', hasNoExtension('packages/shared/dist', '.ts'), '.ts files found in dist'),
  );
  checks.push(check('api/dist has no .ts files', hasNoExtension('apps/api/dist', '.ts'), '.ts files found in dist'));

  // ── 3. Workspace Import Boundary ──
  checks.push(
    check(
      'shared/dist has no @ayantaraz imports',
      hasNoPattern('packages/shared/dist', /@ayantaraz/),
      'workspace imports found in shared dist',
    ),
  );

  // ── 4. Package Contract ──
  try {
    const pkg = JSON.parse(fs.readFileSync('packages/shared/package.json', 'utf-8'));
    checks.push(
      check(
        'shared package.json main → dist',
        typeof pkg.main === 'string' && pkg.main.includes('dist'),
        `main is "${pkg.main}" (expected dist/)`,
      ),
    );
    checks.push(
      check(
        'shared package.json types → dist',
        typeof pkg.types === 'string' && pkg.types.includes('dist'),
        `types is "${pkg.types}" (expected dist/)`,
      ),
    );
  } catch {
    checks.push(check('shared package.json readable', false, 'failed to read package.json'));
  }

  // ── 5. Build Graph ──
  checks.push(check('tsconfig.base.json exists', exists('tsconfig.base.json'), 'missing tsconfig.base.json'));
  checks.push(check('turbo.json exists', exists('turbo.json'), 'missing turbo.json'));

  // ── 6. No Test Files in Dist ──
  checks.push(
    check(
      'shared/dist has no test files',
      !isDir('packages/shared/dist') ||
        (hasNoExtension('packages/shared/dist', '.spec.js') && hasNoExtension('packages/shared/dist', '.test.js')),
      'test files found in dist',
    ),
  );

  const passed = checks.filter((c) => c.passed).length;
  const failed = checks.filter((c) => !c.passed).length;

  const report: ValidationReport = {
    timestamp: new Date().toISOString(),
    passed,
    failed,
    checks,
    safe: failed === 0,
  };

  return report;
}

// ── Run ──
const report = validate();

console.log('=== Build Validation Gate (Node) ===');
console.log(`Timestamp: ${report.timestamp}`);
console.log('');

for (const c of report.checks) {
  const icon = c.passed ? '✓' : '✗';
  console.log(`${icon} ${c.name}${c.passed ? '' : ` — ${c.message}`}`);
}

console.log('');
console.log(`Passed: ${report.passed}`);
console.log(`Failed: ${report.failed}`);

if (!report.safe) {
  console.log('');
  console.log('BUILD VALIDATION FAILED — DO NOT PACKAGE');
  process.exit(1);
}

console.log('');
console.log('BUILD VALIDATION PASSED — SAFE TO PACKAGE');
process.exit(0);
