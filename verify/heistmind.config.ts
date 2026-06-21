// Greenlight verify spec for heistmind (next/vercel) — run by .github/workflows/greenlight-verify.yml
// after Vercel deploys (deployment_status). An array combines modes (allPass):
//  - api: the deployed URL serves (200) — the deployment signal.
//  - agent-web: an LLM drives the live UI; runs ONLY when ANTHROPIC_API_KEY is set (else omitted,
//    so the gate stays green). Replace the scenario with real HeistMind user tasks + assertions.
// Unit tests live in this repo's own CI (pnpm validate) — not the per-deploy gate.
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

export default [{ mode: 'api', checks: [{ path: '/', status: 200 }] }, ...agentWeb];
