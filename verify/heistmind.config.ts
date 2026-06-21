// Greenlight verify spec for heistmind (next/vercel) — run by .github/workflows/greenlight-verify.yml
// after Vercel deploys (deployment_status). An array combines modes (allPass):
//  - api: the deployed URL serves (200).
//  - test: this tool's own suite — set the real command for your package manager.
//  - agent-web: an LLM drives the live UI; runs ONLY when ANTHROPIC_API_KEY is set (else omitted,
//    so the gate stays green). Replace the scenario with real user tasks + assertions.
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

export default [
  { mode: 'api', checks: [{ path: '/', status: 200 }] },
  // HeistMind is pnpm + turbo. `pnpm test` runs the workspace suite; narrow with --filter or drop
  // this spec if you'd rather let PR CI own unit tests and keep the deploy gate to api + agent-web.
  { mode: 'test', command: 'pnpm test' },
  ...agentWeb,
];
