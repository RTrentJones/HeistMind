// node --test scripts/vercel-migration-gate.test.mjs (wired as `pnpm test:scripts`).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  BUILD,
  CHECK_NAME,
  SKIP,
  classify,
  gateApplies,
  runGate,
} from './vercel-migration-gate.mjs';

const PROD = {
  VERCEL_ENV: 'production',
  VERCEL_GIT_COMMIT_SHA: 'abc1234def',
  VERCEL_GIT_REPO_OWNER: 'RTrentJones',
  VERCEL_GIT_REPO_SLUG: 'HeistMind',
  HEISTMIND_MIGRATION_GATE_TIMEOUT_S: '90',
  HEISTMIND_MIGRATION_GATE_INTERVAL_S: '30',
};

/** A fake clock + fetch that serves one response per poll (the last one repeats). */
function harness(responses) {
  let t = 0;
  const calls = [];
  return {
    calls,
    deps: {
      now: () => t,
      sleep: async ms => {
        t += ms;
      },
      log: () => {},
      fetch: async (url, init) => {
        calls.push({ url, init });
        const r = responses[Math.min(calls.length - 1, responses.length - 1)];
        if (r instanceof Error) throw r;
        if (typeof r === 'number')
          return { ok: false, status: r, statusText: 'err', json: async () => ({}) };
        return { ok: true, status: 200, json: async () => ({ check_runs: r }) };
      },
    },
  };
}

const run = (id, status, conclusion = null) => ({ id, status, conclusion });

test('classify: no runs yet is pending; the latest attempt wins', () => {
  assert.equal(classify([]), 'pending');
  assert.equal(classify([run(1, 'in_progress')]), 'pending');
  assert.equal(classify([run(1, 'completed', 'success')]), 'success');
  assert.equal(classify([run(1, 'completed', 'skipped')]), 'failed');
  // A failed first attempt followed by a green re-run → success.
  assert.equal(
    classify([run(1, 'completed', 'failure'), run(2, 'completed', 'success')]),
    'success'
  );
  // A green attempt followed by a re-run still in progress → wait for the re-run.
  assert.equal(classify([run(2, 'queued'), run(1, 'completed', 'success')]), 'pending');
});

test('gateApplies: only production, with a break-glass switch', () => {
  assert.equal(gateApplies({ VERCEL_ENV: 'production' }), true);
  assert.equal(gateApplies({ VERCEL_ENV: 'preview' }), false);
  assert.equal(gateApplies({}), false);
  assert.equal(gateApplies({ VERCEL_ENV: 'production', HEISTMIND_MIGRATION_GATE: 'OFF' }), false);
});

test('preview builds are never gated (no GitHub call)', async () => {
  const h = harness([[]]);
  assert.equal(await runGate({ ...PROD, VERCEL_ENV: 'preview' }, h.deps), BUILD);
  assert.equal(h.calls.length, 0);
});

test('production builds once the migration check goes green', async () => {
  const h = harness([[], [run(7, 'in_progress')], [run(7, 'completed', 'success')]]);
  assert.equal(await runGate({ ...PROD, GITHUB_CHECKS_TOKEN: 'tok' }, h.deps), BUILD);
  assert.equal(h.calls.length, 3);
  assert.match(
    h.calls[0].url,
    /\/repos\/RTrentJones\/HeistMind\/commits\/abc1234def\/check-runs\?/
  );
  assert.ok(h.calls[0].url.includes(`check_name=${encodeURIComponent(CHECK_NAME)}`));
  assert.equal(h.calls[0].init.headers.Authorization, 'Bearer tok');
});

test('the gate only trusts the production-schema check, never development or validation', () => {
  // main and development share a sha after a fast-forward promotion; supabase-ci names the job per
  // target schema, and only the main push reports "(production)".
  assert.equal(CHECK_NAME, 'Migrations applied (production)');
  const job = readFileSync(
    new URL('../.github/workflows/supabase-ci.yml', import.meta.url),
    'utf8'
  );
  assert.ok(
    job.includes(
      "name: Migrations applied (${{ github.event_name != 'pull_request' && github.ref == 'refs/heads/main' && 'production' ||"
    )
  );
});

test('production is cancelled when the migration check fails', async () => {
  const h = harness([[run(3, 'completed', 'failure')]]);
  assert.equal(await runGate(PROD, h.deps), SKIP);
  assert.equal(h.calls[0].init.headers.Authorization, undefined);
});

test('production fails closed when the check never resolves (incl. API errors)', async () => {
  const h = harness([403, new Error('ECONNRESET'), [run(1, 'queued')]]);
  assert.equal(await runGate(PROD, h.deps), SKIP);
  // 90 s budget at 30 s → polls at t=0,30,60,90, then gives up rather than overrun the deadline.
  assert.equal(h.calls.length, 4);
});

test('production without the git system env vars fails closed', async () => {
  const h = harness([[]]);
  assert.equal(await runGate({ VERCEL_ENV: 'production' }, h.deps), SKIP);
  assert.equal(h.calls.length, 0);
});
