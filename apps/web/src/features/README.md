# Feature conventions

Each `features/{concept}/` folder owns one domain concept end-to-end: its **data seam**, its
components, and any concept-local hooks/stores. The rules below are what the ESLint config
enforces mechanically plus the conventions it can't.

## The data seam (`data/`)

- `data/queries.ts` — the ONLY read path. Exposes a `{concept}Keys` key factory, a
  `{concept}Queries` **`queryOptions` factory** (one definition of key + fn per query; reused by
  hooks and `useQueries` fan-outs), and thin `useX()` hooks over it.
- Conditional queries use **`skipToken`**, never `enabled: !!id` + `id!` — the factory narrows the
  id once; non-null assertions are a lint **error**.
- `data/mutations.ts` — every write is a `useMutation` whose `onSuccess` calls `invalidateQueries`
  with the concept's keys (prefer the `*.all` prefix when a write affects multiple views).
- `data/api.ts` — ONLY where a non-React writer needs the seam (Zustand store actions). Plain
  async functions that invalidate through the shared `getQueryClient()`.
- `getRepositories()` and the `@heist-mind/database` factories are importable **only** inside
  `features/*/data/**` (ESLint `no-restricted-imports` enforces this — the datastore swaps behind
  the provider factory with zero component changes).
- Errors: `unwrap()` throws `RepositoryError` (typed as RQ's `defaultError` via module
  augmentation) — read `query.error.message` / `.code` directly, never cast.

## Mutation call conventions

- **Sequenced writes** (roll → stress, score → log event): `await mutation.mutateAsync(...)` inside
  `try/catch`, surfacing the failure in component state.
- **Single fire-and-observe writes**: `mutation.mutate(vars, { onError })`; busy state comes from
  `mutation.isPending`, never a local `useState`.

## Staleness policy

- Default: the shared client's `staleTime: 30s` (single-user data whose writers all invalidate).
- **Shared campaign state that other clients mutate** (roster, character detail) is load-on-view:
  `staleTime: 0, refetchOnMount: 'always'` inside the options factory, with the rationale in its
  doc comment (there is no realtime layer — invalidation can't cover another player's writes).
- Before shipping a migrated read, list its writers; any writer outside the seam means
  load-on-view or a same-PR migration (the twice-bitten round-1 lesson).

## Cross-feature imports

Allowed: another feature's `data/` hooks + key factories (for invalidation), the auth store's
`useAuth`/`useAuthActions`, and components a feature deliberately shares (e.g. rolls' `RollPanel`/
`RollLog` composed into the character sheet). Not allowed: reaching into another feature's
internal state or duplicating its UI — extract a shared component into the owning feature instead
(see `ClockTile`, `GameCard`, `SignInGate`).

## Strings

Components use the `useTranslation` hooks. `i18n.t()` directly is for code that runs outside
React (store actions, the `useSignIn` failure path). The `i18next/no-literal-string` gate keeps
JSX copy translated.
