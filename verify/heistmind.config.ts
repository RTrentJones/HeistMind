// Greenlight verify spec for heistmind (next/vercel) — run by .github/workflows/greenlight-verify.yml
// after Vercel deploys (deployment_status). An array combines modes (allPass):
//  - api: deployment_status' target_url is the *.vercel.app deployment URL, gated by Vercel
//    Deployment Protection (401). With VERCEL_AUTOMATION_BYPASS_SECRET set we send the bypass header
//    and assert 200 (the real app); without it we assert 401 (the deployment is served + protected).
//  - agent-web: an LLM drives the live UI; runs ONLY when ANTHROPIC_API_KEY is set (else omitted).
// Unit tests live in this repo's own CI (pnpm validate) — not the per-deploy gate.
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const api = bypass
  ? {
      mode: 'api',
      checks: [{ path: '/', status: 200, requestHeaders: { 'x-vercel-protection-bypass': bypass } }],
    }
  : { mode: 'api', checks: [{ path: '/', status: 401 }] };
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

export default [api, ...agentWeb];
