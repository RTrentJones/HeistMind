#!/usr/bin/env node
// Vercel "Ignored Build Step" (vercel.json `ignoreCommand`): holds a PRODUCTION build until the
// `production` schema migrations for the same commit have been applied (F101).
//
// Why: prod web deploys ride Vercel's git integration on `main`, and the migration deploy is a
// separate GitHub Actions job (supabase-ci.yml). Without a gate the two race, and a flake in the
// migration job (F101: registry rate limits) let new web code go live against a schema that lacks
// its RPCs. This script waits for the always-present "Migrations applied" check run
// (supabase-ci.yml's `migrations-applied` job) on VERCEL_GIT_COMMIT_SHA:
//   success                  → build (exit 1)
//   failure/cancelled/...    → cancel this build (exit 0); prod stays on the previous deployment
//   still pending at timeout → cancel (fail CLOSED); re-deploy once the migration job is green
// Non-production builds (beta/previews) are never gated.
//
// Vercel's contract is inverted: exit 0 = SKIP the build, exit 1 = PROCEED.
//
// Runs before `pnpm install`, so it uses only Node built-ins (global fetch, Node ≥ 18).
// Env (Vercel): VERCEL_ENV, VERCEL_GIT_COMMIT_SHA, VERCEL_GIT_REPO_OWNER, VERCEL_GIT_REPO_SLUG are
// system variables. Optional project env vars:
//   GITHUB_CHECKS_TOKEN          read-only token (fine-grained: this repo, "Checks: read"). The repo
//                                is public, so it works without one, but unauthenticated calls
//                                share Vercel's egress IPs' 60 req/h limit — set it.
//   HEISTMIND_MIGRATION_GATE     "off" disables the gate (break-glass; or when Vercel's native
//                                Deployment Checks are used instead).
//   HEISTMIND_MIGRATION_GATE_TIMEOUT_S / _INTERVAL_S   poll budget (default 1500 s / 30 s).

import { pathToFileURL } from 'node:url';

export const CHECK_NAME = 'Migrations applied';

export const BUILD = 1;
export const SKIP = 0;

/**
 * Classify the check runs GitHub returned for one commit + check name.
 * @param {Array<{id:number,status:string,conclusion:string|null}>} runs
 * @returns {'success'|'failed'|'pending'}
 */
export function classify(runs) {
  if (!Array.isArray(runs) || runs.length === 0) return 'pending';
  // A re-run creates a new check run; the highest id is the latest attempt.
  const latest = [...runs].sort((a, b) => b.id - a.id)[0];
  if (latest.status !== 'completed') return 'pending';
  return latest.conclusion === 'success' ? 'success' : 'failed';
}

/** Decide up front whether the gate applies to this build at all. */
export function gateApplies(env) {
  if ((env.HEISTMIND_MIGRATION_GATE ?? '').toLowerCase() === 'off') return false;
  return env.VERCEL_ENV === 'production';
}

async function fetchRuns({ owner, repo, sha, token, fetchImpl }) {
  const url = `https://api.github.com/repos/${owner}/${repo}/commits/${sha}/check-runs?check_name=${encodeURIComponent(CHECK_NAME)}&filter=all&per_page=50`;
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'heistmind-migration-gate',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetchImpl(url, { headers });
  if (!res.ok) throw new Error(`GitHub API ${res.status} ${res.statusText}`);
  const body = await res.json();
  return body.check_runs ?? [];
}

/**
 * Poll until the check resolves or the budget runs out. Returns the Vercel exit code.
 * Injected fetch/sleep/now/log keep it unit-testable.
 */
export async function runGate(env, deps = {}) {
  const fetchImpl = deps.fetch ?? globalThis.fetch;
  const sleep = deps.sleep ?? (ms => new Promise(r => setTimeout(r, ms)));
  const now = deps.now ?? (() => Date.now());
  const log = deps.log ?? (msg => console.log(`[migration-gate] ${msg}`));

  if (!gateApplies(env)) {
    log(
      env.VERCEL_ENV === 'production'
        ? 'HEISTMIND_MIGRATION_GATE=off — building without waiting for migrations.'
        : `VERCEL_ENV=${env.VERCEL_ENV ?? 'unset'} — not a production build, no gate.`
    );
    return BUILD;
  }

  const sha = env.VERCEL_GIT_COMMIT_SHA;
  const owner = env.VERCEL_GIT_REPO_OWNER;
  const repo = env.VERCEL_GIT_REPO_SLUG;
  if (!sha || !owner || !repo) {
    log(
      'Missing VERCEL_GIT_COMMIT_SHA / VERCEL_GIT_REPO_OWNER / VERCEL_GIT_REPO_SLUG — cannot prove ' +
        'migrations ran; CANCELLING this production build (fail closed). Enable "Automatically ' +
        'expose System Environment Variables", or set HEISTMIND_MIGRATION_GATE=off to bypass.'
    );
    return SKIP;
  }

  const timeoutMs = Number(env.HEISTMIND_MIGRATION_GATE_TIMEOUT_S ?? 1500) * 1000;
  const intervalMs = Number(env.HEISTMIND_MIGRATION_GATE_INTERVAL_S ?? 30) * 1000;
  const token = env.GITHUB_CHECKS_TOKEN;
  const deadline = now() + timeoutMs;
  log(`Waiting for "${CHECK_NAME}" on ${owner}/${repo}@${sha.slice(0, 7)} (production build).`);

  for (;;) {
    let state = 'pending';
    try {
      state = classify(await fetchRuns({ owner, repo, sha, token, fetchImpl }));
    } catch (err) {
      log(`Lookup failed (${err instanceof Error ? err.message : String(err)}); retrying.`);
    }
    if (state === 'success') {
      log('Production migrations applied — building.');
      return BUILD;
    }
    if (state === 'failed') {
      log(
        `"${CHECK_NAME}" did not succeed — CANCELLING this production build so the web code ` +
          'cannot go live ahead of its schema. Fix/re-run the Supabase CI/CD run, then redeploy.'
      );
      return SKIP;
    }
    if (now() + intervalMs > deadline) {
      log(
        `"${CHECK_NAME}" still unresolved after ${Math.round(timeoutMs / 1000)} s — CANCELLING ` +
          '(fail closed). Redeploy from Vercel once the Supabase CI/CD run is green.'
      );
      return SKIP;
    }
    await sleep(intervalMs);
  }
}

const invokedDirectly =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  runGate(process.env)
    .then(code => process.exit(code))
    .catch(err => {
      // Never fail OPEN on a production build: an unexpected crash cancels it.
      console.log(`[migration-gate] Unexpected error: ${err instanceof Error ? err.stack : err}`);
      process.exit(gateApplies(process.env) ? SKIP : BUILD);
    });
}
