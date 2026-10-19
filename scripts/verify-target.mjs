#!/usr/bin/env node
// greenlight-verify.yml's target resolver (round 5 P1-1). Decides, from a Vercel
// `deployment_status` event, whether the deployment is the BETA deployment, the PROD deployment,
// or neither — and, inside the serialized gate job, whether this (target, sha) already passed.
//
// Why a script: F101 filtered on `github.event.deployment.ref == 'development' | 'main'`, but
// Vercel posts the COMMIT SHA as the deployment `ref` (e.g. deployment 7164273008: ref = sha =
// 0546e9ec…, environment "Preview"), so every gate was skipped — beta and prod, including the
// "Migrations applied (production)" backstop — and the skip was a silent grey job.
//
// The model (branch facts are read from the GitHub API at event time, never from the payload):
//   PROD  = environment "Production" AND the sha is reachable from `main` (main's tip, or an
//           ancestor of it — a Vercel redeploy of an earlier prod commit is still prod).
//           A Production deployment of a sha NOT on main is an anomaly (a CLI `vercel --prod`
//           from a local branch): it is reported as an ERROR (the run goes red) — a prod gate must
//           never vanish quietly.
//   BETA  = any other environment AND the sha is `development`'s tip or an ancestor of it (the
//           merge was superseded by a newer one before Vercel finished building).
//   NONE  = a feature-branch preview (the sha is not in development). Skipped, but VISIBLY: a
//           notice annotation + a job summary say why (PR CI's `e2e` job gates those).
// The compare API answers "is A in B": compare/{sha}...{branch} → `identical` (sha is the tip) or
// `ahead` (the branch has moved past sha, which it contains) ⇒ contained; `behind`/`diverged` ⇒ not.
//
// Dedupe (`dedupe` command): a second successful deployment of an already-verified (target, sha) —
// a Vercel redeploy — is skipped when a check run named `gate (<target>)` (the gate job's name)
// already concluded `success` on that sha. Keyed on the GATE JOB's own check run, not the run
// title: a run whose gate job was skipped (feature preview, duplicate) also concludes "success",
// so a title match would let a skipped run vouch for a real one.
//
// Usage (Node built-ins only — runs before `pnpm install`):
//   node scripts/verify-target.mjs resolve   # env: DEPLOY_ENVIRONMENT, DEPLOY_SHA
//   node scripts/verify-target.mjs dedupe    # env: TARGET, DEPLOY_SHA
// Common env: GITHUB_REPOSITORY (owner/repo), GITHUB_TOKEN, GITHUB_OUTPUT, GITHUB_STEP_SUMMARY.
// Optional: VERIFY_BETA_BRANCH (default development), VERIFY_PROD_BRANCH (default main).

import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const PROD_ENVIRONMENT = 'Production';
export const gateJobName = target => `gate (${target})`;

/**
 * Is `sha` contained in the compared branch? (`compare/{sha}...{branch}` status.)
 * @param {string} status identical | ahead | behind | diverged
 */
export function containedIn(status) {
  return status === 'identical' || status === 'ahead';
}

async function api(path, { token, fetchImpl }) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'heistmind-verify-target',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetchImpl(`https://api.github.com/${path}`, { headers });
  if (!res.ok) {
    const err = new Error(`GitHub API ${res.status} ${res.statusText ?? ''} for ${path}`.trim());
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/** Retry transient lookups a few times; a 404 (unknown sha/branch) is an answer, not a blip. */
async function withRetry(fn, { attempts = 3, sleep }) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      if (err?.status === 404 || err?.status === 422) throw err;
      if (i < attempts - 1) await sleep(2000 * (i + 1));
    }
  }
  throw last;
}

/** compare/{sha}...{branch} status, or null when GitHub has no such comparison (404/422). */
async function compareStatus(repo, sha, branch, deps) {
  try {
    const body = await withRetry(
      () => api(`repos/${repo}/compare/${sha}...${encodeURIComponent(branch)}?per_page=1`, deps),
      deps
    );
    return body.status ?? null;
  } catch (err) {
    if (err?.status === 404 || err?.status === 422) return null;
    throw err;
  }
}

/**
 * Resolve the gate target for one deployment.
 * @returns {Promise<{target:'beta'|'prod'|'none', level:'info'|'notice'|'error', reason:string}>}
 */
export async function resolveTarget(env, deps = {}) {
  const fetchImpl = deps.fetch ?? globalThis.fetch;
  const sleep = deps.sleep ?? (ms => new Promise(r => setTimeout(r, ms)));
  const ctx = { token: env.GITHUB_TOKEN, fetchImpl, sleep };
  const repo = env.GITHUB_REPOSITORY;
  const sha = env.DEPLOY_SHA;
  const environment = env.DEPLOY_ENVIRONMENT ?? '';
  const betaBranch = env.VERIFY_BETA_BRANCH || 'development';
  const prodBranch = env.VERIFY_PROD_BRANCH || 'main';
  const short = (sha ?? '').slice(0, 7);

  if (!repo || !sha) {
    return {
      target: 'none',
      level: 'error',
      reason:
        'The deployment event has no sha / repository — cannot tell beta from prod, so nothing ' +
        'was verified. Re-run the workflow.',
    };
  }

  if (environment === PROD_ENVIRONMENT) {
    const status = await compareStatus(repo, sha, prodBranch, ctx);
    if (containedIn(status)) {
      return {
        target: 'prod',
        level: 'info',
        reason: `Production deployment of ${short}, which is ${
          status === 'identical' ? `the tip of ${prodBranch}` : `on ${prodBranch}`
        } → prod gate.`,
      };
    }
    return {
      target: 'none',
      level: 'error',
      reason:
        `A Production deployment of ${short} is NOT on ${prodBranch} (compare: ${status ?? 'not found'}). ` +
        `Production is only ever deployed from ${prodBranch}; find out who deployed it (a CLI ` +
        '`vercel --prod`?) and roll it back or promote through develop→main.',
    };
  }

  const status = await compareStatus(repo, sha, betaBranch, ctx);
  if (containedIn(status)) {
    return {
      target: 'beta',
      level: 'info',
      reason: `${environment || 'Preview'} deployment of ${short}, which is ${
        status === 'identical'
          ? `the tip of ${betaBranch}`
          : `in ${betaBranch} (${betaBranch} has moved on since)`
      } → beta gate.`,
    };
  }
  return {
    target: 'none',
    level: 'notice',
    reason:
      `${environment || 'Preview'} deployment of ${short} is not in ${betaBranch} (compare: ` +
      `${status ?? 'not found'}) — a feature-branch preview. Not gated here: PR CI's e2e job runs ` +
      `the same suite against a local stack, and the beta gate runs once this lands in ${betaBranch}.`,
  };
}

/**
 * Has `gate (<target>)` already passed on this sha? (A redeploy of a verified artifact.)
 * @returns {Promise<{skip:boolean, reason:string}>}
 */
export async function dedupe(env, deps = {}) {
  const fetchImpl = deps.fetch ?? globalThis.fetch;
  const sleep = deps.sleep ?? (ms => new Promise(r => setTimeout(r, ms)));
  const ctx = { token: env.GITHUB_TOKEN, fetchImpl, sleep };
  const name = gateJobName(env.TARGET);
  const short = (env.DEPLOY_SHA ?? '').slice(0, 7);
  let runs = [];
  try {
    const body = await withRetry(
      () =>
        api(
          `repos/${env.GITHUB_REPOSITORY}/commits/${env.DEPLOY_SHA}/check-runs?check_name=${encodeURIComponent(name)}&filter=all&per_page=50`,
          ctx
        ),
      ctx
    );
    runs = body.check_runs ?? [];
  } catch (err) {
    // Fail toward VERIFYING: a lookup error must never skip a gate.
    return {
      skip: false,
      reason: `Dedupe lookup failed (${err instanceof Error ? err.message : String(err)}); verifying.`,
    };
  }
  const passed = runs.some(r => r.status === 'completed' && r.conclusion === 'success');
  return passed
    ? {
        skip: true,
        reason: `"${name}" already passed on ${short} in an earlier run — this is a duplicate deployment of a verified artifact (e.g. a Vercel redeploy); skipping.`,
      }
    : { skip: false, reason: `No earlier green "${name}" on ${short}; verifying.` };
}

function emit(env, outputs, { level, title, reason }) {
  if (env.GITHUB_OUTPUT) {
    appendFileSync(
      env.GITHUB_OUTPUT,
      Object.entries(outputs)
        .map(([k, v]) => `${k}=${v}\n`)
        .join('')
    );
  }
  if (env.GITHUB_STEP_SUMMARY) {
    appendFileSync(env.GITHUB_STEP_SUMMARY, `### ${title}\n\n${reason}\n`);
  }
  const annotation = level === 'error' ? 'error' : level === 'notice' ? 'notice' : null;
  // Annotations show on the run page (not only in the log) — the visible part of a skip.
  console.log(annotation ? `::${annotation} title=${title}::${reason}` : `${title}: ${reason}`);
}

export async function main(cmd, env, deps) {
  if (cmd === 'resolve') {
    const r = await resolveTarget(env, deps);
    const title =
      r.target === 'none'
        ? r.level === 'error'
          ? 'Deploy gate: not verified'
          : 'Deploy gate skipped (not a beta/prod deployment)'
        : `Deploy gate target: ${r.target}`;
    emit(env, { target: r.target }, { level: r.level, title, reason: r.reason });
    return r.level === 'error' ? 1 : 0;
  }
  if (cmd === 'dedupe') {
    const d = await dedupe(env, deps);
    emit(
      env,
      { skip: String(d.skip) },
      {
        level: d.skip ? 'notice' : 'info',
        title: d.skip ? 'Deploy gate: already verified' : 'Deploy gate: verifying',
        reason: d.reason,
      }
    );
    return 0;
  }
  console.log(`usage: verify-target.mjs resolve|dedupe (got ${cmd ?? 'nothing'})`);
  return 2;
}

const invokedDirectly =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  main(process.argv[2], process.env)
    .then(code => process.exit(code))
    .catch(err => {
      // An unexpected crash fails the run RED (never a silent skip).
      console.log(
        `::error title=Deploy gate resolver crashed::${err instanceof Error ? err.message : err}`
      );
      process.exit(1);
    });
}
