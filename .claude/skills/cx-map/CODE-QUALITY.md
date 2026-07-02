# HeistMind — Code-Quality Backlog

Companion to `FINDINGS.md` (which logs user-facing CX flaws + FitD-rule gaps). This file is the
standing **architecture / code-quality** backlog from the 2026-06-29 FANG-bar audit (three lenses: CX
per page, frontend architecture, data layer) + direct verification. Items are tiered to the remediation
PR sequence. Flip an item to `done @<sha>` when it ships.

> **Progress (2026-06-29):** Tier 1 (PR2, `c492cbf`) and Tier 2 (PR3, `bebe87f`) shipped. **C5** moved
> into Tier 3/PR4 (the throwing methods are still called by the store loaders being reworked there).
> **C11** (`<ResourceList>`) deferred — lower-priority list scaffolding, follow-up.
>
> **Progress (2026-07-01):** Tier 3 is **mostly shipped**, split into CI-gated slices merged to
> `development` (each verified by build + lint + type-check + the Playwright E2E suite + preview
> `greenlight verify`):
>
> - **PR4a — provider + read hooks:** #90 (Tier 1–2 rebase), #91 (foundation: `QueryClientProvider`,
>   `lib/query/result.ts` `unwrap()`, first `features/{concept}/data/queries.ts` modules, **deleted the
>   dead `characters-store` + `games-store`** — they had zero consumers, −980 LOC), #92 (page reads +
>   a deterministic fix for the chronically-flaky standalone-characters "move" E2E), #93
>   (AttachToCampaign + CharacterEditor reads).
> - **PR4b — write mutations:** #94 (ClocksPanel = the mutation template), #95 (FactionsPanel, reusing
>   the clocks mutations for faction project clocks), #96 (CrewSheet), #97 (**the roll-feed cluster**:
>   campaign hub + RollPanel/RollLog/AddResultForm/ScorePanel/CharacterRoster — replaced the hub's
>   `rollKey` re-render bridge with query invalidation; added `scores/`, `profiles/`, `rolls/`
>   mutations + `characters` stress/retire mutations), #98 (CharacterSheet + LoadoutCard; added
>   `useUpdateCharacter`/`useUpdateCharacterData`/`useAddExperience`; retired RollPanel's `onRolled`
>   and RollLog's `refreshKey` props).
> - **Seam state:** `features/{characters,games,rolls,scores,clocks,factions,crews,rulesets,profiles}/data/`
>   exist. **11 files still call `getRepositories()` directly** (the remainder of C15):
>   `app/{characters,games,rulesets}/page.tsx` (clone / join / rulesets-page loads), `GameForm` (create),
>   `AttachToCampaign` (the attach/detach RPC writes), `InviteCodeSection`, `RulesetUpload`,
>   `LoadBuiltinRulesetButton`, `CharacterEditor` (save/advance), `auth-store`,
>   `character-creation-store`. **C14 (the ESLint boundary rule) lands after those** — it must be the
>   last change so the rule passes with zero violations.
>
> ⚠️ **Migration lesson (hit twice — #97, #98):** a read migrated to `useQuery` inherits
> `staleTime: 30_000`; if an **unmigrated writer** mutates that data and the flow navigates back to a
> view that cached it, RQ serves stale data (the old `useEffect` loaders refetched on every mount).
> Bit the roster (`useCharactersByGame` vs the creation wizard) and the sheet (`useCharacterDetail` vs
> AttachToCampaign detach/move) — both now `staleTime: 0` + `refetchOnMount: 'always'` (load-on-view,
> per the BRD's shared-state model). **Audit every migrated read for "unmigrated writer +
> navigate-back" before pushing**; when the writer later joins the seam, its mutation's
> `invalidateQueries` is the proper fix.

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

## Tier 3 (PR4) — React Query foundation = the single client data-access seam 🔶 in flight (#91–#98)

- **C12** ✅ done @e0ccfd8 (#91) — `QueryClientProvider` (one shared `QueryClient`) in
  `app/providers.tsx`; `staleTime: 30_000, retry: 1, refetchOnWindowFocus: false`.
- **C13** ✅ done (pattern established #91–#98) — per-concept `features/{concept}/data/` modules
  (`queries.ts` + `mutations.ts`): the **only** code importing `getRepositories()` and unwrapping
  `Result<T>` (`lib/query/result.ts` `unwrap()` throws on `!success`). Typed hooks over stable query
  keys (`['characters','game',gameId]`, …). _Deviation from the draft: queryFn uses RQ's built-in
  `retry: 1` rather than wrapping `resilienceService.executeWithResilience` — the resilience service
  remains available for non-query async work._
- **C14** ⏳ pending — ESLint `no-restricted-imports` (or `boundaries`) rule: ban `getRepositories` /
  repository imports outside `features/*/data/**` (domain types + pure rules stay allowed). **Must land
  last**, after the 11 remaining call sites (see Progress note) migrate. This is the enforceable
  "swap the DB at will" guarantee.
- **C15** 🔶 mostly done — all inline `useEffect`/`active`-guard loaders and the coupled write surfaces
  are on the seam (#92–#98); the dead `characters-store` + `games-store` were **deleted outright**
  (#91 — simpler than the planned "retire the loader halves": they had no consumers at all). Remaining:
  the 11 files listed in the Progress note (simple writes + `CharacterEditor` + the two stores).
- **C16** 🔶 mostly done — every migrated write is a `useMutation` with `invalidateQueries` (kills
  the full-reload flicker and the `rollKey` re-render bridge). The notification store is now
  actually **rendered** (`NotificationToaster` mounted in `Providers` — before PR4c nothing
  subscribed to it, so the wizard's toasts were dispatched into the void), and the sign-in/out
  `console.error`-only paths (F58: AuthHeader, HomePage, games/rulesets pages) now also raise an
  error toast. _Deliberate deviation:_ **no optimistic updates and no blanket success toasts** this
  round — invalidation-refetch was chosen for correctness and in-place UI updates are the feedback;
  optimism/success-toasts remain an available follow-up polish pass.

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
