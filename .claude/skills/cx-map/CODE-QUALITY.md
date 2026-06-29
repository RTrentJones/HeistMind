# HeistMind — Code-Quality Backlog

Companion to `FINDINGS.md` (which logs user-facing CX flaws + FitD-rule gaps). This file is the
standing **architecture / code-quality** backlog from the 2026-06-29 FANG-bar audit (three lenses: CX
per page, frontend architecture, data layer) + direct verification. Items are tiered to the remediation
PR sequence. Flip an item to `done @<sha>` when it ships.

> **Progress (2026-06-29):** Tier 1 (PR2, `c492cbf`) and Tier 2 (PR3, `bebe87f`) shipped. **C5** moved
> into Tier 3/PR4 (the throwing methods are still called by the store loaders being reworked there).
> **C11** (`<ResourceList>`) deferred — lower-priority list scaffolding, follow-up. Tier 3 (PR4) and
> Tier 4 (PR5) remain.

> **Calibration:** load-on-view with no realtime is an **intentional BRD decision** — "React Query
> unused" is not a blocker on its own. The real costs are (a) repeated fetch boilerplate, (b)
> full-reload-after-mutation flicker, and (c) no single seam isolating the datastore. There are **no
> true S1 blockers**; this is a solid app with fixable polish/architecture debt.

## Guiding decisions (set with the user, 2026-06-29)

1. **Data foundation → React Query (full adoption).** `@tanstack/react-query` is already a dependency
   with **0 uses**. `shared/services/api-client.ts` is a REST/fetch client (`baseUrl: '/api'`) but the
   app has **no REST API** — every read/write calls Supabase repositories directly returning `Result<T>`
   (`packages/database/src/domain-types.ts:826`). So apiClient is the wrong shape; delete the REST shell,
   **keep** `resilience-service.ts` (retry / circuit-breaker) and wire it into the React Query queryFn.
2. **One reusable component per "concept" (character, crew, campaign…).** No duplicate view/edit
   implementations. (Character card is currently implemented 3×.)
3. **Clean Supabase abstraction = a single, lint-enforced client data-access seam.** The
   `@heist-mind/database` package already hides Supabase (frontend imports only domain types, pure rules,
   and the `getRepositories()`/factory). The leak is ~29 ad-hoc `getRepositories()` call sites. The React
   Query hooks layer (`features/{concept}/data/`) becomes the **only** code allowed to touch repositories;
   an ESLint rule enforces it. Swapping the datastore = replace the adapter behind the provider factory,
   zero frontend changes. (Server-side transport boundary is **out of scope** this round.)
4. **Scope = code-quality + dedup + data-foundation only.** Onboarding (F37) + mobile sheet (F57) are
   separate scoped follow-ups.

---

## Tier 1 (PR2) — behavior-preserving quick wins ✅ done @c492cbf (C5 → PR4)

- **C1** Delete the REST `apiClient` shell: `apps/web/src/shared/services/api-client.ts` +
  `shared/services/examples/` + its `README.md` claims. **Keep** `resilience-service.ts` +
  `error-handler.ts` (consumed by PR4). Correct the docs: `CLAUDE.md` + `CX-MAP.md` "all API calls go
  through `apiClient`" → describe the Supabase-repos-direct (→ React Query) path. _(grep-prove 0 importers
  first.)_
- **C2** Delete dead code: `shared/stores/index.ts` `initializeStores`/`resetAllStores` stubs; the
  **shadow subset** of `packages/shared/src/types.ts` (`Character`, `Campaign`, `GameSession`, `DiceRoll`,
  `GameSystemConfig`) — grep-verify each unused first. **Keep** `CharacterSheet` + `TabletopRpgGameData`
  (imported by the standalone/in-game character pages + `CharacterSheet.tsx`).
- **C3** Extract duplicate `newId()` (`supabase-character-repository.ts` +
  `supabase-character-management-repository.ts`) into one shared helper.
- **C4** Types: `SchemaName = 'development' | 'production'` union (replace `schema(this.schema as
'development')` casts in repos); `toJson(value): Json` helper (replace ~6 `as unknown as Json` in the
  character/ruleset/game adapters); `parseSupabaseJson<T>(value: unknown, …)` (`profile-adapter.ts:61`,
  drop `any`).
- **C5** Trim throwing interface methods to what's implemented across the 5 repos (~15 `not implemented`
  members + their interface declarations): game `findPublic/update/delete/canUserJoin`, ruleset
  `findPublic/findWithDetails/delete/searchByTags/checkUsage`, game-player
  `removePlayer/updateRole/getUserGameContext`, character `delete/transferToGame`, invitation
  `cleanupExpired`. Keep `transferToGame` only if Phase 5c will use it.
- **C6** `findWithDetails` sequential character→game→ruleset→profile fetch → `Promise.all`.
- **C7** i18n in `.ts` (JSX-only lint misses): `character-creation-store.ts:310/318/344`,
  `use-dashboard-data.ts:63` → route through i18n; add a lint guard covering stores/hooks.
- **C8** `notification-store` id → `crypto.randomUUID()` (drop deprecated `substr`/`Date.now()+random`).

## Tier 2 (PR3) — DS primitives + presentational dedup (no data change) ✅ C9–C10 done @bebe87f (C11 deferred)

- **C9** `packages/ui` `<Select>` (native `<select>` + shared token + real associated `<label>`, a11y);
  replace the ~9 raw-`<select>` copies. _(See `FINDINGS.md` F59.)_
- **C10** `<CharacterCard>` (+ optional `actions` slot) + one exported `characterStatusVariant`; replace
  the 3 implementations (`Dashboard.tsx:87`, `CharacterRoster.tsx:87`, `app/characters/page.tsx:79`);
  reconcile the **diverged** `STATUS_VARIANT` maps into one canonical mapping.
- **C11** `<ResourceList>` (loading / empty / error scaffold) + one empty-state pattern; apply to games,
  characters, rulesets, dashboard (currently inconsistent: games = plain text, characters = card + CTA).

## Tier 3 (PR4) — React Query foundation = the single client data-access seam

- **C12** `QueryClientProvider` (one shared `QueryClient`) in `app/providers.tsx` (innermost).
- **C13** Per-concept `features/{concept}/data/` modules: the **only** code importing `getRepositories()`
  / repositories and unwrapping `Result<T>` (throw on `!success`). Typed hooks
  (`useCharacters`/`useCharacter`/`useUpdateCharacter`, `useGames`/`useGame`, `useRolls`, …) over stable
  query keys. Wrap queryFn in `resilienceService.executeWithResilience` (or RQ `retry`).
- **C14** ESLint `no-restricted-imports` (or `boundaries`) rule: ban `getRepositories` / `@heist-mind/
database` _repository_ imports outside `features/*/data/**` (domain types + pure rules stay allowed).
  This is the enforceable "swap the DB at will" guarantee.
- **C15** Migrate every consumer to the seam: replace the ~11 inline `useEffect`/`let active = true`
  copies (`app/characters/page.tsx`, `app/games/page.tsx`, `app/games/[gameId]/page.tsx`, the two
  `.../new` pages, `use-dashboard-data.ts`, `CharacterEditor.tsx`, `CharacterRoster.tsx`,
  `AttachToCampaign.tsx`, `RollLog.tsx`, `GameForm.tsx`); retire the loader/cache halves of
  `characters-store.ts` + `games-store.ts` (Zustand keeps UI/client state only).
- **C16** `useMutation` per write with optimistic update + `invalidateQueries` + success toast
  (notification store). Standardize user-facing failures on the notification store (replace silent
  `console.error` in sign-in paths: `HomePage`, `AuthHeader`, `games/page`). _(Resolves F58.)_

## Tier 4 (PR5) — reusable per-concept view/edit + god-component splits

- **C17** Split `CharacterEditor.tsx` (759) + `CharacterSheet.tsx` (572) into reusable `<XpTracksCard>`,
  `<GearCard>`, `<HarmCard>` (lift the 40–90-line inline IIFEs) + a `useCharacterAdvancement` hook; view
  and edit become thin compositions over the shared cards (one implementation per concept surface).
- **C18** Same treatment for `CrewSheet.tsx` (524); align with the character pattern.
- **C19** Role-gate write affordances client-side (read-only for non-GM/owner) rather than render-then-
  fail-at-RLS. _(Resolves `FINDINGS.md` F42.)_

## Out of scope (this round)

Adopting a server-side data boundary (Server Actions / Route Handlers); onboarding (F37); mobile sheet
(F57); Phase 5c cross-ruleset. No new backend/REST API — React Query wraps the existing repositories via
the seam.
