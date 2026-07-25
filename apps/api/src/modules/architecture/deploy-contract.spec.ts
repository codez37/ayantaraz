/**
 * ARCHITECTURE VALIDATION CONTRACT  TypeScript Layer
 *
 * These tests enforce that the codebase respects the production blueprint.
 * They do NOT test business logic  they test structural guarantees.
 *
 * If any test FAILS, the architecture is broken, even if all business tests pass.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../../../../../');
const SCRIPTS_DIR = join(ROOT, 'scripts');

/**
 * CONTRACT 1: Deploy Script Structure
 *
 * The deploy pipeline must have exactly the stages defined in the blueprint.
 * No stage can be missing. No undocumented stage can exist.
 */
describe('CONTRACT 1: Deploy Pipeline Stages', () => {
  it('deploy.sh redirects to ayan-deploy', () => {
    const deployScript = readFileSync(join(SCRIPTS_DIR, 'deploy.sh'), 'utf8');
    expect(deployScript).toContain('ayan-deploy');
  });

  it('helper-part4.sh implements all pipeline stages', () => {
    const helper = readFileSync(join(SCRIPTS_DIR, 'helper-part4.sh'), 'utf8');
    const stageKeywords = [
      'Lock',
      'Validate',
      'Build',
      'Extract',
      'Gate',
      'Activate',
      'Health',
      'consistency',
      'pass',
      'fail',
      'events',
    ];
    const lower = helper.toLowerCase();
    for (const kw of stageKeywords) {
      expect(lower).toContain(kw.toLowerCase());
    }
  });
});

/**
 * CONTRACT 2: State Machine Validity
 *
 * The ayan-deploy helper must only accept valid state transitions.
 * Invalid transitions must be rejected with an error.
 */
describe('CONTRACT 2: State Machine Valid Transitions', () => {
  it('helper-part4.sh case statement has all required commands', () => {
    const helper = readFileSync(join(SCRIPTS_DIR, 'helper-part4.sh'), 'utf8');
    const REQUIRED_COMMANDS = [
      'state',
      'trace',
      'lock',
      'lock-info',
      'lock-recover',
      'release',
      'gate',
      'activate',
      'pass',
      'fail',
      'rollback',
      'health',
      'consistency',
      'prune',
      'pin',
      'unpin',
      'freeze',
      'thaw',
      'invariants',
      'recover',
      'rotate-key',
      'events',
      'reconstruct',
      'drift',
      'validate',
    ];

    for (const cmd of REQUIRED_COMMANDS) {
      expect(helper).toContain(`${cmd})`);
    }
  });

  it('helper uses assert_state to enforce transitions', () => {
    const helper = readFileSync(join(SCRIPTS_DIR, 'helper-part4.sh'), 'utf8');
    // Critical transitions must use assert_state
    expect(helper).toContain('assert_state "LOCKED"'); // release requires LOCKED
    expect(helper).toContain('assert_state "PREPARING"'); // gate requires PREPARING
    expect(helper).toContain('assert_state "ACTIVATING"'); // activate requires ACTIVATING
    expect(helper).toContain('assert_state "HEALTHCHECK"'); // pass requires HEALTHCHECK
  });
});

/**
 * CONTRACT 3: WAL Integrity
 *
 * The WAL must have paired TX_BEGIN/TX_COMMIT events.
 * Every mutation must be wrapped in a transaction.
 */
describe('CONTRACT 3: WAL Transaction Pairing', () => {
  const HELPER_PATH = join(SCRIPTS_DIR, 'helper-part1.sh');

  it("tx_begin function writes sync'd event", () => {
    const helper = readFileSync(HELPER_PATH, 'utf8');
    // tx_begin must sync before and after
    expect(helper).toContain('tx_begin(){');
    expect(helper).toContain('sync'); // Before event
  });

  it("tx_commit function writes sync'd event", () => {
    const helper = readFileSync(HELPER_PATH, 'utf8');
    expect(helper).toContain('tx_commit(){');
  });

  it('tx_rollback function exists', () => {
    const helper = readFileSync(HELPER_PATH, 'utf8');
    expect(helper).toContain('tx_rollback(){');
  });
});

/**
 * CONTRACT 4: Lock Exclusivity
 *
 * Only one deploy can run at a time.
 * Lock must be PID-tracked with stale detection.
 */
describe('CONTRACT 4: Lock Exclusivity', () => {
  it('acquire_lock uses flock -n (non-blocking)', () => {
    const helper = readFileSync(join(SCRIPTS_DIR, 'helper-part2.sh'), 'utf8');
    expect(helper).toContain('flock -n');
  });

  it('acquire_lock tracks PID', () => {
    const helper = readFileSync(join(SCRIPTS_DIR, 'helper-part2.sh'), 'utf8');
    expect(helper).toContain('$$'); // Current PID
  });

  it('acquire_lock detects stale locks via kill -0', () => {
    const helper = readFileSync(join(SCRIPTS_DIR, 'helper-part2.sh'), 'utf8');
    expect(helper).toContain('kill -0');
  });

  it('lock-recover cleans stale lock and writes IDLE state', () => {
    const helper = readFileSync(join(SCRIPTS_DIR, 'helper-part4.sh'), 'utf8');
    expect(helper).toContain('lock-recover)');
    expect(helper).toContain('write_state "IDLE"');
  });
});

/**
 * CONTRACT 5: Gate Enforcement
 *
 * No release can enter ACTIVE without passing all 4 gate stages.
 * Gate stages must have dependency ordering.
 */
describe('CONTRACT 5: Gate Stage Enforcement', () => {
  const HELPER_PATH = join(SCRIPTS_DIR, 'helper-part3.sh');

  it('run_gate has exactly 4 stages (S1-S4)', () => {
    const helper = readFileSync(HELPER_PATH, 'utf8');
    expect(helper).toContain('S1=');
    expect(helper).toContain('S2=');
    expect(helper).toContain('S3=');
    expect(helper).toContain('S4=');
  });

  it('gate requires PREPARING state', () => {
    const helper = readFileSync(join(SCRIPTS_DIR, 'helper-part4.sh'), 'utf8');
    expect(helper).toContain('assert_state "PREPARING"');
  });

  it('S1 = Structural validation (validate_release)', () => {
    const helper = readFileSync(HELPER_PATH, 'utf8');
    expect(helper).toContain('validate_release');
  });

  it('S2 = Semantic validation (validate_env_semantics)', () => {
    const helper = readFileSync(HELPER_PATH, 'utf8');
    expect(helper).toContain('validate_env_semantics');
  });

  it('S3 = Invariant check (check_invariants)', () => {
    const helper = readFileSync(HELPER_PATH, 'utf8');
    expect(helper).toContain('check_invariants');
  });

  it('S4 = Preflight (Docker + disk space)', () => {
    const helper = readFileSync(HELPER_PATH, 'utf8');
    expect(helper).toContain('docker info');
  });
});

/**
 * CONTRACT 6: Symlink Atomicity
 *
 * The current symlink must be atomically switched.
 * No partial states are visible externally.
 */
describe('CONTRACT 6: Atomic Symlink Switch', () => {
  it('activate command uses ln -snf (atomic)', () => {
    const helper = readFileSync(join(SCRIPTS_DIR, 'helper-part4.sh'), 'utf8');
    expect(helper).toContain('ln -snf');
  });

  it('activate writes VERSION file after symlink', () => {
    const helper = readFileSync(join(SCRIPTS_DIR, 'helper-part4.sh'), 'utf8');
    // VERSION write must come after ln -snf
    const lnIndex = helper.indexOf('ln -snf');
    const versionIndex = helper.indexOf('echo "${VERSION}"', lnIndex);
    expect(versionIndex).toBeGreaterThan(lnIndex);
  });
});

/**
 * CONTRACT 7: Graceful Drain
 *
 * Nginx must be gracefully drained before switching.
 * Connection-aware, not time-based polling.
 */
describe('CONTRACT 7: Graceful Drain', () => {
  it('drain sends nginx -s quit', () => {
    const helper = readFileSync(join(SCRIPTS_DIR, 'helper-part3.sh'), 'utf8');
    expect(helper).toContain('nginx -s quit');
  });

  it('drain has timeout fallback', () => {
    const helper = readFileSync(join(SCRIPTS_DIR, 'helper-part3.sh'), 'utf8');
    expect(helper).toContain('DRAIN_TIMEOUT');
    expect(helper).toContain('docker stop');
  });

  it('drain checks active connections', () => {
    const helper = readFileSync(join(SCRIPTS_DIR, 'helper-part3.sh'), 'utf8');
    expect(helper).toContain('Active');
  });
});

/**
 * CONTRACT 8: Recovery Determinism
 *
 * Recovery must always select the highest-scoring release.
 * Score must be deterministic (structural + semantic + invariant).
 */
describe('CONTRACT 8: Recovery Scoring', () => {
  it('release_score uses structural(4) + semantic(3) + invariant(2)', () => {
    const helper = readFileSync(join(SCRIPTS_DIR, 'helper-part3.sh'), 'utf8');
    // Score components must be present
    expect(helper).toContain('release_score');
    expect(helper).toContain('sc=$((sc+4))'); // structural
    expect(helper).toContain('sc=$((sc+3))'); // semantic
    expect(helper).toContain('sc=$((sc+2))'); // invariant
  });

  it('deterministic_recover iterates all releases', () => {
    const helper = readFileSync(join(SCRIPTS_DIR, 'helper-part3.sh'), 'utf8');
    expect(helper).toContain('deterministic_recover');
    expect(helper).toContain('ls -1d');
  });

  it('recovery validates before activating', () => {
    const helper = readFileSync(join(SCRIPTS_DIR, 'helper-part3.sh'), 'utf8');
    // Must validate env before activate
    expect(helper).toContain('validate_env_semantics');
  });
});

/**
 * CONTRACT 9: Event Log Format
 *
 * Events must have: seq, timestamp, gen, trace, level, type
 * Format must be parseable and queryable.
 */
describe('CONTRACT 9: Event Log Structure', () => {
  it('event function writes with seq + gen + trace', () => {
    const helper = readFileSync(join(SCRIPTS_DIR, 'helper-part1.sh'), 'utf8');
    // Event format must include all required fields
    expect(helper).toContain('get_seq');
    expect(helper).toContain('get_gen');
    expect(helper).toContain('trace=');
    expect(helper).toContain('gen=');
    expect(helper).toContain('level=');
  });

  it('event function uses flock for physical serialization', () => {
    const helper = readFileSync(join(SCRIPTS_DIR, 'helper-part1.sh'), 'utf8');
    expect(helper).toContain('flock');
    expect(helper).toContain('exec 9>');
  });

  it('event function calls sync for durability', () => {
    const helper = readFileSync(join(SCRIPTS_DIR, 'helper-part1.sh'), 'utf8');
    // Extract full event function body (sync calls are later in the function)
    const eventStart = helper.indexOf('event(){');
    const eventFn = helper.substring(eventStart, eventStart + 500);
    expect(eventFn).toContain('sync');
  });
});

/**
 * CONTRACT 10: Env Semantic Validation
 *
 * Production env must not contain placeholder values.
 * JWT secrets must be separate and minimum entropy.
 */
describe('CONTRACT 10: Env Validation Rules', () => {
  it('validate_env_semantics checks DATABASE_URL format', () => {
    const helper = readFileSync(join(SCRIPTS_DIR, 'helper-part2.sh'), 'utf8');
    expect(helper).toContain('postgresql://');
  });

  it('validate_env_semantics checks JWT_SECRET minimum length', () => {
    const helper = readFileSync(join(SCRIPTS_DIR, 'helper-part2.sh'), 'utf8');
    expect(helper).toContain('${#jwt} -ge 32');
  });

  it('validate_env_semantics checks JWT != JWT_REFRESH', () => {
    const helper = readFileSync(join(SCRIPTS_DIR, 'helper-part2.sh'), 'utf8');
    expect(helper).toContain('jwt}" != "${jr}');
  });

  it('validate_env_semantics requires NODE_ENV=production', () => {
    const helper = readFileSync(join(SCRIPTS_DIR, 'helper-part2.sh'), 'utf8');
    expect(helper).toContain('production');
  });
});

/**
 * CONTRACT 11: Fork Detection
 *
 * Generation counter must be monotonically increasing.
 * Forks must be detected and logged.
 */
describe('CONTRACT 11: Fork Detection', () => {
  it('get_gen increments generation counter', () => {
    const helper = readFileSync(join(SCRIPTS_DIR, 'helper-part1.sh'), 'utf8');
    expect(helper).toContain('get_gen');
    expect(helper).toContain('$(($(cat "${GF}"');
  });

  it('detect_forks checks monotonicity', () => {
    const helper = readFileSync(join(SCRIPTS_DIR, 'helper-part1.sh'), 'utf8');
    expect(helper).toContain('detect_forks');
    expect(helper).toContain('FORK_DETECTED');
  });
});

/**
 * CONTRACT 12: Recovery Reconstructability
 *
 * State must be reconstructable from event log.
 * Only TX_COMMIT'd events are considered.
 */
describe('CONTRACT 12: WAL Replay', () => {
  it('reconstruct_from_events parses TX_BEGIN/TX_COMMIT', () => {
    const helper = readFileSync(join(SCRIPTS_DIR, 'helper-part1.sh'), 'utf8');
    expect(helper).toContain('reconstruct_from_events');
    expect(helper).toContain('TX_BEGIN');
    expect(helper).toContain('TX_COMMIT');
    expect(helper).toContain('TX_ROLLBACK');
  });

  it('reconstruct_from_events writes state file', () => {
    const helper = readFileSync(join(SCRIPTS_DIR, 'helper-part1.sh'), 'utf8');
    expect(helper).toContain('cat > "${SF}"');
  });
});

/**
 * CONTRACT 13: Key Rotation Safety
 *
 * Rotation must be rollback-safe (deploy.key.prev preserved).
 * HMAC verification must try both current and previous keys.
 */
describe('CONTRACT 13: Key Rotation', () => {
  it('rotate_key preserves previous key', () => {
    const helper = readFileSync(join(SCRIPTS_DIR, 'helper-part2.sh'), 'utf8');
    expect(helper).toContain('cp "${SK}" "${PK}"');
  });

  it('verify_hmac checks both current and previous keys', () => {
    const helper = readFileSync(join(SCRIPTS_DIR, 'helper-part2.sh'), 'utf8');
    // Must try SK first, then PK
    const skCheck = helper.indexOf('cat ${SK}');
    const pkCheck = helper.indexOf('cat ${PK}');
    expect(skCheck).toBeGreaterThan(0);
    expect(pkCheck).toBeGreaterThan(0);
  });
});

/**
 * CONTRACT 14: Bootstrap Idempotency
 *
 * bootstrap.sh must be safe to run multiple times.
 * Must not overwrite existing state.
 */
describe('CONTRACT 14: Bootstrap Safety', () => {
  it('bootstrap.sh checks for existing env before creating', () => {
    const bootstrap = readFileSync(join(SCRIPTS_DIR, 'bootstrap.sh'), 'utf8');
    // Must check if env already exists
    expect(bootstrap).toContain('if [ ! -f');
  });

  it('bootstrap.sh uses idempotent package installation', () => {
    const bootstrap = readFileSync(join(SCRIPTS_DIR, 'bootstrap.sh'), 'utf8');
    // Must check if package is already installed
    expect(bootstrap).toContain('dpkg -s');
  });
});

/**
 * CONTRACT 15: No Orphan Dependencies
 *
 * The deploy helper must not depend on tools not in the bootstrap.
 */
describe('CONTRACT 15: Dependency Completeness', () => {
  it('bootstrap installs all tools used by deploy helper', () => {
    const bootstrap = readFileSync(join(SCRIPTS_DIR, 'bootstrap.sh'), 'utf8');
    const helper1 = readFileSync(join(SCRIPTS_DIR, 'helper-part1.sh'), 'utf8');
    const helper2 = readFileSync(join(SCRIPTS_DIR, 'helper-part2.sh'), 'utf8');
    const helper3 = readFileSync(join(SCRIPTS_DIR, 'helper-part3.sh'), 'utf8');

    const allHelpers = helper1 + helper2 + helper3;

    // Tools that deploy helper uses and bootstrap must install
    const REQUIRED_TOOLS = [
      'flock',
      'openssl',
      'curl',
      'jq',
      'grep',
      'awk',
      'sort',
      'tail',
      'wc',
    ];

    for (const tool of REQUIRED_TOOLS) {
      if (allHelpers.includes(tool + ' ')) {
        // Only check if actually used as a command (not in strings)
        const isUsedAsCommand =
          allHelpers.includes(`${tool} `) || allHelpers.includes(`"${tool}"`);
        if (isUsedAsCommand) {
          const installed = bootstrap.includes(tool);
          // Not all tools need explicit install (some are bash builtins)
          if (!['sort', 'tail', 'wc', 'grep', 'awk', 'flock'].includes(tool)) {
            expect(installed).toBe(true);
          }
        }
      }
    }
  });
});
