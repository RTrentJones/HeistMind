// Greenlight verify spec for heistmind (next/vercel) — run by .github/workflows/greenlight-verify.yml
// after Vercel deploys (deployment_status). An array combines modes (allPass):
//  - api: deployment_status' target_url is the *.vercel.app deployment URL, gated by Vercel
//    Deployment Protection (401). With VERCEL_AUTOMATION_BYPASS_SECRET set we send the bypass header
//    and assert 200 (the real app); without it we assert 401 (the deployment is served + protected).
//  - agent-web: an LLM drives the live UI; runs ONLY when ANTHROPIC_API_KEY is set (else omitted).
// Unit tests live in this repo's own CI (pnpm validate) — not the per-deploy gate.
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
// Telemetry-into-verify: on a FAILED check, attach the why to the report (no separate dashboard
// trip). $GREENLIGHT_VERIFY_URL is the exact failing deployment URL, injected by the harness (no
// hard-coding). Try Vercel runtime logs (when VERCEL_API_TOKEN is present) and always capture the
// live HTTP response (status/headers). Best-effort — never fails the gate.
const logsOnFailure =
  '{ vercel logs "$GREENLIGHT_VERIFY_URL" --token "$VERCEL_API_TOKEN" 2>&1 | head -30; echo "--- response ---"; curl -sS -i "$GREENLIGHT_VERIFY_URL" 2>&1 | head -20; } || true';
const api = bypass
  ? {
      mode: 'api',
      checks: [
        { path: '/', status: 200, requestHeaders: { 'x-vercel-protection-bypass': bypass } },
      ],
      logsOnFailure,
    }
  : { mode: 'api', checks: [{ path: '/', status: 401 }], logsOnFailure };
const agentWeb = process.env.ANTHROPIC_API_KEY
  ? [
      {
        mode: 'agent-web',
        scenarios: [
          {
            name: 'home renders',
            task: 'Open the home page and confirm the app loads without an error screen.',
            asserts: [{ selector: 'body' }],
          },
        ],
      },
    ]
  : [];

// playwright suite — the deep deploy gate. Runs the full e2e/ suite against the EXACT deployed
// URL (greenlight injects it as PLAYWRIGHT_BASE_URL). Auth is handled by admin session injection,
// not Discord (see e2e/README.md). The suite skips its auth-gated specs unless this env's
// SUPABASE_SERVICE_ROLE_KEY is present, so the gate stays green on the public surface meanwhile.
//
// Guarded by GREENLIGHT_PLAYWRIGHT=1 because the `suite` field requires greenlight-verify with the
// playwright-suite fix (packages/verify). Until that's published, the CI workflow runs the same
// suite directly (greenlight-verify.yml); flip the flag once `npx @rtrentjones/greenlight` ships it.
const playwright =
  process.env.GREENLIGHT_PLAYWRIGHT === '1'
    ? [
        {
          mode: 'playwright',
          suite: { command: 'pnpm exec playwright test', timeoutMs: 600_000 },
          logsOnFailure,
        },
      ]
    : [];

export default [api, ...playwright, ...agentWeb];
