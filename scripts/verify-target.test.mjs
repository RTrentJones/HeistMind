// node --test scripts/verify-target.test.mjs (wired into `pnpm test:scripts`).
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { containedIn, dedupe, gateJobName, main, resolveTarget } from './verify-target.mjs';

const SHA = '0546e9ecb080c8dc525399195c06354b3ea0e595';
const BASE = { GITHUB_REPOSITORY: 'RTrentJones/HeistMind', GITHUB_TOKEN: 'tok', DEPLOY_SHA: SHA };

/**
 * A fake GitHub: `routes` maps a path prefix (after api.github.com/) to a response — an object
 * (200 JSON), a number (that HTTP status) or an Error (network failure). Calls are recorded.
 */
function github(routes) {
  const calls = [];
  return {
    calls,
    deps: {
      sleep: async () => {},
      fetch: async (url, init) => {
        const path = url.replace('https://api.github.com/', '');
        calls.push({ path, init });
        const key = Object.keys(routes).find(k => path.startsWith(k));
        const r = key === undefined ? 404 : routes[key];
        if (r instanceof Error) throw r;
        if (typeof r === 'number')
          return { ok: false, status: r, statusText: 'err', json: async () => ({}) };
        return { ok: true, status: 200, json: async () => r };
      },
    },
  };
}
const cmp = branch => `repos/RTrentJones/HeistMind/compare/${SHA}...${branch}`;

test('containedIn: identical/ahead mean the sha is in the branch', () => {
  assert.equal(containedIn('identical'), true);
  assert.equal(containedIn('ahead'), true);
  assert.equal(containedIn('behind'), false);
  assert.equal(containedIn('diverged'), false);
  assert.equal(containedIn(null), false);
  assert.equal(gateJobName('beta'), 'gate (beta)');
});

test('a development merge (Vercel ref = sha, env Preview, sha = development tip) → beta', async () => {
  const gh = github({ [cmp('development')]: { status: 'identical' } });
  const r = await resolveTarget({ ...BASE, DEPLOY_ENVIRONMENT: 'Preview' }, gh.deps);
  assert.equal(r.target, 'beta');
  assert.match(r.reason, /tip of development/);
  // The token rides the request; only the beta branch is consulted for a Preview.
  assert.equal(gh.calls.length, 1);
  assert.equal(gh.calls[0].init.headers.Authorization, 'Bearer tok');
});

test('a development merge superseded before the build finished (an ancestor) → still beta', async () => {
  const gh = github({ [cmp('development')]: { status: 'ahead', ahead_by: 1 } });
  const r = await resolveTarget({ ...BASE, DEPLOY_ENVIRONMENT: 'Preview' }, gh.deps);
  assert.equal(r.target, 'beta');
  assert.match(r.reason, /moved on/);
});

test('a feature-branch push (sha ahead of / diverged from development) → none, a notice', async () => {
  for (const status of ['behind', 'diverged']) {
    const gh = github({ [cmp('development')]: { status } });
    const r = await resolveTarget({ ...BASE, DEPLOY_ENVIRONMENT: 'Preview' }, gh.deps);
    assert.equal(r.target, 'none');
    assert.equal(r.level, 'notice');
    assert.match(r.reason, /feature-branch preview/);
  }
  // A sha GitHub can't compare (404) is not in development either.
  const gh = github({});
  const r = await resolveTarget({ ...BASE, DEPLOY_ENVIRONMENT: 'Preview' }, gh.deps);
  assert.equal(r.target, 'none');
  assert.equal(r.level, 'notice');
});

test('a prod fast-forward of a sha that is also on development → prod (main decides, not development)', async () => {
  const gh = github({
    [cmp('main')]: { status: 'identical' },
    [cmp('development')]: { status: 'identical' },
  });
  const r = await resolveTarget({ ...BASE, DEPLOY_ENVIRONMENT: 'Production' }, gh.deps);
  assert.equal(r.target, 'prod');
  assert.deepEqual(
    gh.calls.map(c => c.path.split('?')[0]),
    [cmp('main')]
  );
});

test('a Vercel redeploy of an earlier prod commit (an ancestor of main) → prod', async () => {
  const gh = github({ [cmp('main')]: { status: 'ahead', ahead_by: 3 } });
  const r = await resolveTarget({ ...BASE, DEPLOY_ENVIRONMENT: 'Production' }, gh.deps);
  assert.equal(r.target, 'prod');
});

test('a Production deployment of a sha NOT on main → none, an ERROR (never a quiet skip)', async () => {
  const gh = github({ [cmp('main')]: { status: 'diverged' } });
  const r = await resolveTarget({ ...BASE, DEPLOY_ENVIRONMENT: 'Production' }, gh.deps);
  assert.equal(r.target, 'none');
  assert.equal(r.level, 'error');
});

test('transient API failures retry, then throw (the run goes red, not grey)', async () => {
  let n = 0;
  const flaky = {
    sleep: async () => {},
    fetch: async () => {
      n++;
      if (n < 3) return { ok: false, status: 502, statusText: 'Bad Gateway', json: async () => ({}) };
      return { ok: true, status: 200, json: async () => ({ status: 'identical' }) };
    },
  };
  const r = await resolveTarget({ ...BASE, DEPLOY_ENVIRONMENT: 'Preview' }, flaky);
  assert.equal(r.target, 'beta');
  assert.equal(n, 3);

  const down = github({ [cmp('development')]: new Error('ECONNRESET') });
  await assert.rejects(resolveTarget({ ...BASE, DEPLOY_ENVIRONMENT: 'Preview' }, down.deps));
});

test('a missing sha in the event is an error', async () => {
  const r = await resolveTarget({ GITHUB_REPOSITORY: 'o/r', DEPLOY_ENVIRONMENT: 'Preview' }, {});
  assert.equal(r.level, 'error');
});

const checks = `repos/RTrentJones/HeistMind/commits/${SHA}/check-runs`;

test('dedupe: a redeploy of a sha whose gate (target) already passed is skipped', async () => {
  const gh = github({ [checks]: { check_runs: [{ status: 'completed', conclusion: 'success' }] } });
  const d = await dedupe({ ...BASE, TARGET: 'beta' }, gh.deps);
  assert.equal(d.skip, true);
  assert.match(gh.calls[0].path, /check_name=gate%20\(beta\)/);
});

test('dedupe: a failed or in-flight earlier gate, or none at all, still verifies', async () => {
  for (const check_runs of [
    [],
    [{ status: 'completed', conclusion: 'failure' }],
    [{ status: 'completed', conclusion: 'skipped' }],
    [{ status: 'in_progress', conclusion: null }],
  ]) {
    const gh = github({ [checks]: { check_runs } });
    assert.equal((await dedupe({ ...BASE, TARGET: 'prod' }, gh.deps)).skip, false);
  }
  // A lookup failure fails toward verifying.
  const gh = github({ [checks]: 500 });
  assert.equal((await dedupe({ ...BASE, TARGET: 'prod' }, gh.deps)).skip, false);
});

test('main: writes the step output + a job summary, and annotates a skip visibly', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'verify-target-'));
  const out = join(dir, 'out');
  const summary = join(dir, 'summary');
  const logs = [];
  const orig = console.log;
  console.log = m => logs.push(m);
  try {
    const gh = github({ [cmp('development')]: { status: 'diverged' } });
    const code = await main(
      'resolve',
      {
        ...BASE,
        DEPLOY_ENVIRONMENT: 'Preview',
        GITHUB_OUTPUT: out,
        GITHUB_STEP_SUMMARY: summary,
      },
      gh.deps
    );
    assert.equal(code, 0);
    assert.equal(readFileSync(out, 'utf8'), 'target=none\n');
    assert.match(readFileSync(summary, 'utf8'), /Deploy gate skipped[\s\S]*feature-branch/);
    assert.ok(logs.some(l => l.startsWith('::notice title=Deploy gate skipped')));

    // The off-main Production anomaly exits 1 (red run) with an error annotation.
    const gh2 = github({ [cmp('main')]: { status: 'behind' } });
    const code2 = await main(
      'resolve',
      { ...BASE, DEPLOY_ENVIRONMENT: 'Production', GITHUB_OUTPUT: out },
      gh2.deps
    );
    assert.equal(code2, 1);
    assert.ok(logs.some(l => l.startsWith('::error')));

    assert.equal(await main('bogus', BASE, gh.deps), 2);
  } finally {
    console.log = orig;
  }
});

test('the workflow wires the resolver + dedupe and gates on its outputs, not deployment.ref', () => {
  const wf = readFileSync(new URL('../.github/workflows/greenlight-verify.yml', import.meta.url), 'utf8');
  const code = wf
    .split('\n')
    .filter(l => !l.trimStart().startsWith('#'))
    .join('\n');
  assert.doesNotMatch(code, /deployment\.ref/);
  assert.match(wf, /scripts\/verify-target\.mjs resolve/);
  assert.match(wf, /scripts\/verify-target\.mjs dedupe/);
  assert.match(wf, /name: gate \(\$\{\{ needs\.resolve\.outputs\.target \}\}\)/);
  assert.match(wf, /needs\.resolve\.outputs\.target == 'prod'/);
  assert.match(wf, /GREENLIGHT_VERSION: '0\.10\.0'/);
});
