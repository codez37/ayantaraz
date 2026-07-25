import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface ValidatorResult {
  name: string;
  passed: boolean;
  output: string;
  duration: number;
}

function runValidator(name: string, command: string, cwd?: string): ValidatorResult {
  const start = Date.now();
  try {
    const output = execSync(command, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd,
      timeout: 60000,
    });
    return { name, passed: true, output: output.trim(), duration: Date.now() - start };
  } catch (err: unknown) {
    const error = err as { stdout?: string; stderr?: string; message?: string };
    const output = error.stdout?.toString() || error.stderr?.toString() || error.message || 'unknown error';
    return { name, passed: false, output: output.trim(), duration: Date.now() - start };
  }
}

const validators: { name: string; command: string }[] = [
  { name: 'scope-snapshot', command: 'npx tsx scripts/scope-snapshot.ts' },
  { name: 'artifact-validation', command: 'npx tsx scripts/validate-build.ts' },
  { name: 'boundary-enforcement', command: 'bash scripts/enforce-boundaries.sh' },
];

const results = validators.map((v) => runValidator(v.name, v.command));

console.log('=== VALIDATION ORCHESTRATOR ===');
console.log(`Started: ${new Date().toISOString()}`);
console.log('');

const passed = results.filter((r) => r.passed);
const failed = results.filter((r) => !r.passed);

for (const r of results) {
  const icon = r.passed ? '✓' : '✗';
  console.log(`${icon} ${r.name} (${r.duration}ms)`);
  if (!r.passed) {
    const lines = r.output.split('\n').filter((l) => l.trim());
    for (const line of lines.slice(-10)) {
      console.log(`  ${line}`);
    }
  }
}

console.log('');
console.log(`Passed: ${passed.length}/${results.length}`);
console.log(`Duration: ${results.reduce((s, r) => s + r.duration, 0)}ms`);

if (failed.length > 0) {
  console.log('');
  console.log('VALIDATION FAILED');
  process.exit(1);
}

console.log('ALL VALIDATORS PASSED');
process.exit(0);
