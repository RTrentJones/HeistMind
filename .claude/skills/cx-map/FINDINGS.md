# HeistMind — CX & FitD Findings

Flaw + FitD-gap log, per the `cx-map` skill. Severity: **S1** blocker · **S2** major · **S3** minor
· **S4** polish. Type: **CX-flaw** (experience) · **FitD-gap** (rules fidelity). When a fix ships,
flip `status` to `fixed @<sha>` and update the affected `CX-MAP.md` section.

> **Scope note (2026-06-27 re-scope):** HeistMind is now a **between-session tracker**, not a play
> engine — see **`BRD.md`** for the scope-of-record + gap analysis. Several FitD-gap findings are
> reclassified: the BRD's headline gaps (score lifecycle, **per-score loadout**, unified campaign log,
> retire/roster, Discord) supersede them. `**F13**` is **inverted** (loadout leaves the build →
> per-score); **F9 / F15 / F16** (push-bargain / downtime / flashbacks) are now **optional result
> sources**, not required mechanics.

**Audit 1 — 2026-06-25 @ 01594f7.** Exhaustive sweep across all 9 routes, the 5 wizard steps, and
the campaign panels (crew/clocks/factions/rolls), through the UX + FitD lenses in `SKILL.md`.
Findings the maintainer personally re-checked against source are tagged **(verified)**; the rest are
from the audit pass with a cited location and should be re-confirmed before fixing.

Counts: 3 fixed · S1 ×2 · S2 ×16 · S3 ×22 · S4 ×2. _(+F56/F57 from the 2026-06-28 competitive pass —
two S2 product gaps flagged P0 in `COMPETITIVE.md`.)_

**Audit 2 — 2026-06-29 (code-quality / FANG-bar pass).** A three-lens review (CX per page, frontend
architecture, data layer) + direct verification, scoped to **code quality + dedup + data-foundation**.
Findings that are _architecture/code_ (not user-facing CX) live in the companion **`CODE-QUALITY.md`**;
the user-facing CX items are added here as **F58–F60**. Re-confirmed still-open and folded into the
remediation: **F37** (onboarding) and **F57** (mobile sheet) — both **split out as their own scoped
follow-ups**, not part of the code-quality round; **F40** (auth-error dead-end) and **F42** (GM/player
affordances) — confirmed open, F42 is addressed in the remediation's component round. No regressions
found (F1–F9, F20–F22, F30/F31, F35/F36, F53/F54, F56 confirmed still-resolved).

---

## Fixed

### F1 — Empty rating pips become invisible on card hover

- **severity:** S2 · **type:** CX-flaw
- **where:** `packages/ui/src/components/StressTracker.tsx` (`ActionDots` variants) +
  `packages/ui/src/components/Card.tsx:20`
- **root cause:** Empty pips filled with `bg-background-tertiary`; the Card `default` hover was
  `hover:bg-background-tertiary` (and the `character` variant's idle gradient bakes in
  `via-background-tertiary/90`) — same token, so the pip dissolved into the card. Compounding it,
  the pip border `border-primary` shares the exact lightness of `background-tertiary` in both
  themes, so the outline never delineated the pip. Hits every screen with pips in a default/
  character card: `AttributesStep`, `ActionRatingsStep`, `CharacterEditor`, `CharacterSheet`.
- **fix:** Made the empty pip self-delineating — recessed `bg-background-primary` fill + contrasting
  `border-border-secondary` ring (the ring is the load-bearing cue in light mode, the recessed
  fill in dark) — and moved the Card `default` hover off the pip token to `hover:bg-background-elevated`.
- **status:** fixed @24aaa96

### F36 — Ambiguous "Load … starter ruleset" label

- **severity:** S3 · **type:** CX-flaw
- **where:** the ruleset load button + `/rulesets` page
- **root cause:** "Load the Brackwater starter ruleset" didn't say it creates an editable copy you
  own; "load" reads as download/open.
- **fix:** Generalized `LoadDefaultRulesetButton` → `LoadBuiltinRulesetButton({ builtin })` driving a
  built-in catalog; label is now "Add &lt;name&gt; to my rulesets" with a clarifying tooltip.
- **status:** fixed @69180e1

### F35 — Ruleset upload lacked schema/example guidance

- **severity:** S3 · **type:** CX-flaw
- **where:** `apps/web/src/features/rulesets/components/RulesetUpload.tsx`
- **root cause:** The upload form assumed JSON fluency; no outline of the expected shape, no easier
  path for non-authors.
- **fix:** Added a guidance card describing the required/optional `RulesetContent` fields and steering
  users to add a starter from the catalog and edit their copy (no JSON required).
- **status:** fixed @69180e1

---

## S1 — blockers

### F2 — No way for a player to discover or join a campaign

- **severity:** S1 · **type:** CX-flaw · **(verified)**
- **where:** `apps/web/src/app/games/page.tsx:30` (`games.findByCreator(userId)` only); no join /
  browse / invite UI in any `/games` route.
- **root cause:** The campaigns list only queries games you _created_. A `GamePlayer` membership
  model exists in the DB but is never surfaced in the web app, and there's no invite link / join
  code. A player can reach a campaign only via a direct `/games/[gameId]` URL someone hands them,
  and it never appears in their own list — so the core async-multiplayer loop has no front door.
- **fix:** Add an "Invite players" affordance for the GM (shareable link / join code) and a player
  join + "campaigns I'm in" path (query `GamePlayer` memberships, not just `findByCreator`).
- **status:** resolved (PR #59) — `SupabaseInvitationRepository` + `redeem_invite_code` RPC; the
  `/games` hub now lists created **and** joined campaigns with a join-via-code box, and GMs get an
  `InviteCodeSection` code generator. Targeted + public codes. (First-class targeted-invite inbox
  still thin — see F-followups.)

### F3 — Resistance rolls (spend stress to resist a consequence) not implemented

- **severity:** S1 · **type:** FitD-gap
- **where:** `apps/web/src/features/rolls/components/RollPanel.tsx` (only `action`/`fortune`); the
  `RollKind` type already includes `resistance` (`packages/database/src/domain-types.ts`).
- **root cause:** The single most-used non-action move in Blades has no UI and no stress-cost
  (`6 − highest die`) logic; nothing to resist against is captured on a roll.
- **fix:** Resistance mode in `RollPanel` (pick attribute → roll → auto-cost `6 − high` → deduct
  stress); store the consequence + attribute on the `Roll`.
- **status:** resolved (PR #59) — `dice.resistanceStress` (`6 − highest die`, empty ⇒ 6, floored at
  0; unit-tested to 100%); `RollPanel` Resistance mode picks the attribute, rolls, deducts stress via
  `updateCharacterWithValidation`, persists `kind='resistance'`; the log annotates "resisted — N
  stress". (Free-text consequence capture not yet stored — minor follow-up.)

### F53 — A joined player can't open the campaign (ruleset RLS blocks the hub load)

- **severity:** S1 · **type:** CX-flaw / bug · **(verified — caught by `join-via-code.spec.ts`)**
- **where:** `packages/database/src/implementations/supabase-game-repository.ts` `findWithDetails`
  (the ruleset read, ~L126–131) + the `rulesets` SELECT RLS in `supabase/migrations/00002_core_schema.sql:556`
  (`created_by = auth.uid() OR is_public = true`).
- **root cause:** Redeeming an invite code adds an **active** `game_players` row and redirects the
  player to `/games/[id]` (both work). But `GameDetailPage` → `games.findWithDetails` then reads the
  campaign's ruleset with `.single()`. The joined member is neither the ruleset's creator nor is the
  ruleset public, so the `rulesets` RLS returns no row → `.single()` errors → `findWithDetails` fails
  → the hub renders a load error instead of the campaign. **The A1 join flow is end-to-end broken: you
  can join, but you can't use the campaign.** (The `games` SELECT RLS already allows active members, so
  the game row itself is readable — only the ruleset read fails.)
- **fix:** Let an active game member read their campaign's ruleset. Extend the `rulesets` SELECT
  policy with an `EXISTS (… games JOIN game_players … status = 'active' …)` clause (single-DO-block
  per-env migration, mind the 00004 recursion lesson), or have `findWithDetails` fetch the ruleset
  through a SECURITY DEFINER path for members. Security-sensitive — verify on the local Supabase stack.
- **status:** resolved (PR #59, @a893e71) — `00011_ruleset_member_read.sql` adds a SECURITY DEFINER
  `user_can_access_ruleset` helper (active member of a game using the ruleset, bypassing RLS like
  00004's `is_active_game_member`) and extends the rulesets SELECT policy with an additive OR clause.
  **Verified end-to-end:** `join-via-code.spec.ts` (un-fixme'd) passes on CI's local-Supabase E2E —
  a second account redeems a code, opens the campaign, and sees it badged as Player.

### F54 — BitD rules-accuracy audit (rulesets, validation, loadout, crew-aware)

- **severity:** S2 · **type:** FitD-accuracy · **(verified vs the SRD)**
- **where:** `packages/shared/src/{default-ruleset,builtin-rulesets/*}.ts`,
  `packages/database/src/{character-rules,dice,crews}.ts`, `…/ruleset-validation.ts`,
  the character-management repository, and the sheet/editor/crew UI.
- **root cause:** Audit (grounded on https://bladesinthedark.com/character-creation + /vice) found the
  validation _engine_ sound but several rules off: starting action dots gave 5 (Brackwater) / 8 (BitD
  built-in) instead of **7**; 2 abilities at creation instead of **1**; trauma count-only; indulge-vice
  cleared all stress with no roll/overindulge; no heat→wanted cascade; load-boosting abilities ignored;
  shallow ruleset upload validation; crew never consulted (no Mastery cap, Deadly dot, or veteran).
- **fix / status:** **resolved on the `feat/bitd-rules-accuracy` branch** (WS1–WS4 + WS5 core):
  playbooks pre-place 3 dots + assign 4 = 7; exactly 1 starting ability; `traumaConditions` enforced;
  indulge-vice rolls the lowest attribute (clears the highest die, flags overindulge); `applyHeat`
  cascades heat 9 → +1 wanted; ability/crew `effects` raise effective load / action cap (Mastery 4) /
  budget (Deadly) / veteran tier; the repository threads the campaign **crew** into every validation,
  tolerating crew-granted extras as warnings when validated standalone; ruleset upload now cross-checks
  ability/equipment refs + action↔attribute consistency. The single creation-ability slot is a
  **radio-style swap** (clicking another roster ability replaces the seeded pick, not stacks) — this
  also fixed a wizard hang where a disabled ability card read as "not stable" to Playwright. **Level-ups
  honour crew too:** the editor loads the campaign crew so an action-dot advance caps at the crew's
  effective max (Mastery → buy the 4th dot) and the load gauge / live re-validation fold in Mule/Deadly,
  matching the server's `advanceCharacter`. The editor's gear picker now **emphasises the playbook's
  suggested items** (sorted first + "Suggested" badge) while keeping every common item reachable per
  SRD, and the trauma-checklist UI is wired (see F14). The editor's Advancement tab now shows a
  **crew-benefits panel** (Mastery → raise an action to 4; Veteran → take a cross-playbook ability),
  so the crew's effect on caps is discoverable rather than silent. `gm-crew-grant.spec.ts` exercises
  the end-to-end path (crew takes Mastery → a member's editor surfaces the raised action cap).
  **Remaining follow-up:** the **Deadly +1 dot at character creation** belongs in a crew-aware
  _creation wizard_ (the SRD applies Deadly when the character is made, not as a post-hoc editor
  grant) — a separate change.

---

## S2 — major

### F4 — Wizard never says _why_ "Next"/"Create" is disabled

- **severity:** S2 · **type:** CX-flaw
- **where:** `CharacterCreationWizard.tsx` footer + `AttributesStep.tsx:36–42` /
  `ActionRatingsStep.tsx:37–42` (over-budget turns a badge red but shows no message).
- **root cause:** Step validity drives the disabled button, but the underlying validation
  error/code (`POINTBUY_OVER`, `ACTION_POINTS_OVER`, incomplete step) is never surfaced as copy.
- **fix:** Render the first blocking validation message inline near the footer / step
  ("You've spent 8/7 action dots — reduce one to continue").
- **status:** resolved (PR #59) — a `stepError(index)` store selector returns the first blocking
  validation message for the current step (whole-build for review); the wizard footer shows it next
  to a disabled Next/Create in `text-semantic-warning` with an i18n'd "Can't continue yet —" lead-in
  (e.g. "Can't continue yet — Assigned 8 of 7 action dots.").

### F5 — Roll log doesn't say who rolled

- **severity:** S2 · **type:** CX-flaw · **(verified)**
- **where:** `apps/web/src/features/rolls/components/RollLog.tsx:42–56` — shows `label ?? kind`,
  results, position/effect, outcome; never resolves `characterId`/`userId`.
- **root cause:** In an async shared feed, "who acted" is essential context and it's simply absent.
- **fix:** Resolve and show the character name (or player/"GM" for fortune rolls) per entry.
- **status:** resolved (PR #59) — `RollLog` resolves `characterId → name` via `characters.findByGame`
  and shows it per entry (fortune → "Fortune", GM otherwise).

### F6 — Roll log has no timestamps

- **severity:** S2 · **type:** CX-flaw · **(verified)**
- **where:** `RollLog.tsx:42–56` — `Roll.createdAt` exists but is never displayed.
- **root cause:** A play-by-post log spanning days/weeks needs chronological anchors.
- **fix:** Show `createdAt` (relative or short absolute) on each entry.
- **status:** resolved (PR #59) — each entry shows a relative time ("just now / 5m / 3h / 2d ago")
  with the absolute timestamp in a `Tooltip` on a `<time>` element.

### F7 — Zero-dice rolls (rating 0) aren't explained

- **severity:** S2 · **type:** CX-flaw
- **where:** `RollPanel.tsx:61–65` computes `zeroDice` (2d, take lowest) but the UI never shows it;
  `RollLog` shows bare results; `Roll` has no `zeroDice` field to persist it.
- **root cause:** A rating-0 roll shows two dice with no "take lowest" note — reads as a bug.
- **fix:** Annotate zero-dice rolls in panel + log ("2d, take lowest"); persist `zeroDice` on `Roll`.
- **status:** **fixed (fully — backlog round A, 2026-07-11)** — the panel hint shipped in PR #59;
  `zeroDice` persistence landed with migration `00020` (audit P2); and the last piece, the in-log
  annotation, now renders per entry: "0d — rolled 2, took the lowest" on any `zeroDice` (or legacy
  `dice === 0`) roll.

### F8 — Position/effect dropdowns are unexplained jargon

- **severity:** S2 · **type:** CX-flaw
- **where:** `RollPanel.tsx:110–129` — controlled/risky/desperate and limited/standard/great with no
  help text.
- **root cause:** New FitD players can't choose meaningfully without the definitions.
- **fix:** Inline tooltip/legend defining position (safety) and effect (impact).
- **status:** resolved (PR #59) — an ⓘ `Tooltip` beside the effect select defines position
  (Controlled → Risky → Desperate) and effect (Limited → Standard → Great).

### F9 — Push-yourself & Devil's Bargain (+1d) not modeled

- **severity:** S2 · **type:** FitD-gap
- **where:** `RollPanel.tsx` — no pre-roll modifiers; `CreateRollData` has no `stressSpent`.
- **root cause:** Two of the most common dice boosters are unavailable.
- **fix:** Toggles "Push yourself (+1d, 2 stress)" / "Devil's Bargain (+1d)"; add dice, deduct/record
  stress on save.
- **status:** fixed — the action-roll panel has **Push** (+1d, applies 2 stress win-or-lose) and
  **Devil's bargain** (+1d, with an optional complication field) toggles; both grow the dice pool (a
  0-pool still rolls 2 take-lowest), and the move + complication persist to the roll's `note` (shown in
  the feed). No schema change — `note` already existed. https://bladesinthedark.com/index.php/the-roll

### F10 — Teamwork absent (assist / lead group action / set up / protect)

- **severity:** S2 · **type:** FitD-gap
- **where:** `RollPanel.tsx` is single-character only; no roll linking.
- **root cause:** Group play — central to a crew game — has no scaffolding (assist = 1 stress, group
  action, etc.).
- **fix:** Group-action mode linking a lead roll + assist rolls; assisters take stress; mark linked.
- **status:** **fixed — ASSIST (the everyday teamwork move) shipped (backlog round C, 2026-07-11)**:
  the sheet's action roll offers "Assist: <teammate> (+1d, they mark 1 stress)" over the campaign
  roster; engine `rollAction` gained `assist` — the die rides the pool, the helper's stress is
  charged when the roller may write them (own alt / GM) and otherwise the feed note tells the
  helper to self-mark (ownership is a hard security boundary; NOT*OWNER never fails the roll).
  Engine + roll-pool unit-tested. \_Residue (open, by design):* **lead group action / set up /
  protect** are GM-arbitrated multi-roll orchestrations — better run in prose with individual
  rolls; revisit if tables ask for linked-roll mechanics.

### F11 — Starting abilities can be unchecked

- **severity:** S2 · **type:** FitD-gap
- **where:** `AbilitiesStep.tsx` + `character-creation-store.ts` `toggleAbility` (~207–233).
- **root cause:** Abilities seeded from `playbook.startingAbilities` are removable like any other, so
  a character can be created missing its guaranteed ability.
- **fix:** Lock starting abilities (disable removal, badge them "Starting").
- **status:** resolved (BitD-accuracy branch) — `validateCharacter` now requires ≥1 ability at
  creation when the playbook has a roster (`ABILITY_REQUIRED`); the seeded ability can't be removed
  to zero. Brackwater `abilityChoices` 2→1 (BitD = exactly 1).

### F12 — Wizard never collects contacts (friends/rivals)

- **severity:** S2 · **type:** FitD-gap
- **where:** `DEFAULT_STEPS` (`creation-steps.ts`) — `contacts: []` is initialized but no step
  populates it; only editable later in `CharacterEditor`.
- **root cause:** Close friend / rival is part of Blades character identity and is skipped at
  creation.
- **fix:** A contacts step (or extend Identity) picking from the playbook's contacts.
- **status:** **fixed (backlog round C, 2026-07-11)** — the Identity step's LAST field (vice, or
  the combined fallback) carries a "Friends & rivals" picker over the playbook's contact list
  (`setContact('friend'|'rival', …)` — at most one each, replace/clear semantics, store
  unit-tested); hidden for playbooks without contacts. Optional per RAW — never blocks Next.

### F13 — Loadout is on the build, not per-score ~~(was: "wizard never sets loadout")~~

- **severity:** S2 · **type:** FitD-gap · **INVERTED by the BRD re-scope**
- **where:** loadout is a persistent field on `CharacterData`, set in `CharacterEditor`'s build tab.
- **root cause:** BitD loadout is a **per-score** operational choice (pick a load level, equip as you
  go, reset next score) — **not** a creation or advancement choice. The current persistent model is
  wrong; adding it to the wizard (the old "fix") would make it _more_ wrong.
- **fix:** Move loadout **out of the build** and make it **per-character, per-score** — see `BRD.md`
  R-D2 and roadmap Phase 1 (score model + per-score loadout). The load engine (`loadUsed` /
  `effectiveLoadLimit`) is reused as-is.
- **status:** fixed — loadout left the build editor for a per-score `LoadoutCard` on the character
  sheet (load-engine gated, logged, resets against the campaign's active score). Score lifecycle +
  per-score loadout shipped as BRD Phase 1.

### F14 — Trauma is free text, not the named conditions

- **severity:** S2 · **type:** FitD-gap
- **where:** `CharacterData.trauma: string[]` (`domain-types.ts`); shown as badges
  (`CharacterSheet.tsx:271–281`); not validated against the 8 conditions.
- **root cause:** Blades trauma is a fixed set (Cold, Haunted, Obsessed, Paranoid, Reckless, Soft,
  Unstable, Vicious) chosen, not typed; free text loses meaning + uniqueness.
- **fix:** Enum the conditions; pick from a checklist (unique, up to `traumaMax`).
- **status:** resolved — rulesets carry `traumaConditions` (BitD's 8; Brackwater's reskinned 8) and
  `validateCharacter` enforces trauma ∈ the set + distinct (`TRAUMA_UNKNOWN`/`TRAUMA_DUPLICATE`);
  lenient when a ruleset omits it. The editor's Stress & Trauma section now picks from a **checklist**
  of those named conditions (toggle chips, unique, capped at `traumaMax`); rulesets without a named
  set keep the free-text entry.

### F15 — Downtime actions entirely absent

- **severity:** S2 · **type:** FitD-gap
- **where:** `RollKind` includes `downtime` but no UI/model; no recover / acquire asset / long-term
  project / reduce heat / train / indulge-vice.
- **root cause:** The post-score downtime phase — half the FitD loop, and the only way to clear
  stress (indulge vice) — doesn't exist.
- **fix:** A downtime panel; start with the highest-value actions (indulge vice → clear stress;
  recover → healing clock; reduce heat).
- **status:** partially resolved (PR #59, MVP) — "Indulge vice" on the character sheet clears stress
  to 0 and logs a `kind='downtime'` feed entry (rendered with a neutral badge, no dice). The rest of
  the downtime menu (recover/acquire/long-term project/reduce heat/train) is still open.

### F16 — Flashbacks not modeled

- **severity:** S2 · **type:** FitD-gap
- **where:** no `flashback` roll kind / UI.
- **root cause:** Spend-stress-to-retro-establish is a core player-agency move, especially valuable
  in async play where forward planning is hard.
- **fix:** A flashback action: narrate + stress cost → logged roll linked to the triggering moment.
- **status:** **fixed (backlog round C, 2026-07-11)** — new engine `flashback` use-case (pay the
  GM-priced 0/1/2 stress through the clamped write, land the retro-established beat in the feed
  as a note; ownership-gated; engine-tested) + a sheet Flashback row in the Dice card (what you
  establish + stress select + button). E2E in `gm-resistance-downtime.spec.ts` (feed entry +
  stress charge asserted).

### F17 — Crew rep hard-caps at 12 with no rep→tier advancement

- **severity:** S2 · **type:** FitD-gap · **(verified)**
- **where:** `CrewSheet.tsx:187` (`stat('Rep','rep',crew.rep,12)`); the `+` disables at `>= max`
  (`:144`). `CREW_LIMITS` (`crews.ts`) deliberately omits rep.
- **root cause:** Rep should accrue and convert (12 rep → +1 tier, reset rep), not stop at 12. There
  is no conversion path, so crews can't advance tier through play.
- **fix:** Uncap rep; add rep→tier conversion (auto at ≥12 or a GM "Advance tier" button); show the
  rule.
- **status:** fixed — `advanceTier` (`crews.ts`, SRD-grounded: fill the 12-Rep track → +1 Tier,
  clear Rep carrying the remainder, capped at Tier 4) + a GM "Advance to Tier N (spend 12 Rep)" button
  on the crew sheet, shown once Rep ≥ 12. The Rep stat is now uncapped so it can accrue past 12.

### F18 — Crew XP / advancement absent

- **severity:** S2 · **type:** FitD-gap
- **where:** `Crew` tracks `crewAbilities` but no XP/triggers/advancement (`crews.ts`,
  `domain-types.ts`).
- **root cause:** Crews don't earn XP or buy upgrades — the crew-sheet progression half of Blades.
- **fix:** Crew XP track + triggers mirroring character XP; spend to unlock crew abilities/upgrades.
- **status:** fixed — an **8-box crew advancement track** on the crew sheet (`crewXp`/`crewAdvanceReady`/
  `withCrewXp` in `crews.ts`, 100% covered): the GM marks XP (with the four BitD triggers as a hint),
  and a full track shows "Take advance (reset XP)" pointing at the crew-ability list. Stored under a
  reserved key in the existing `resources` JSONB (a deliberate no-migration choice — it can graduate
  to a dedicated column once the generated Supabase types are regenerated). https://bladesinthedark.com/index.php/advancement

### F19 — Heat→Wanted cascade and reduce-heat unmodeled

- **severity:** S2 · **type:** FitD-gap
- **where:** `Crew.heat`/`Crew.wanted` are bare numbers; no threshold logic; no "lay low".
- **root cause:** Heat filling → +1 wanted, and cooling off, are core consequences with no engine.
- **fix:** Heat-threshold + wanted helpers in `crews.ts`; a cool-off action.
- **status:** fixed — `applyHeat` cascades heat 9 → +1 Wanted (clear, carry remainder; SRD-verified)
  and is wired into the crew sheet's heat control. **SRD correction:** core BitD has no "lay low /
  reduce heat" activity — the direct release valve is **incarceration** (a convicted member/ally/framed
  enemy → −1 Wanted and clears Heat). Modelled as `incarcerate` + a GM "Incarcerated" button.

### F20 — Theme system not wired; app is effectively dark-only

- **severity:** S2 · **type:** CX-flaw
- **where:** `apps/web/src/app/layout.tsx` (wraps only `I18nProvider`/`TooltipProvider`);
  `ThemeProvider`/`ThemeToggle` exist in `packages/ui` but are never mounted.
- **root cause:** Without a provider toggling the `.light`/`.dark` class, the light palette in
  `globals.css` is unreachable and there's no user control. _(Note: F1 was fixed to be robust in
  both themes regardless.)_
- **fix:** Mount `ThemeProvider` in the root layout; add `ThemeToggle` to the header. Re-confirm the
  wiring before fixing.
- **status:** resolved (PR #59) — `ThemeProvider` was mounted in the foundation; the DS `ThemeToggle`
  (light/dark/system) now sits in the header (`AuthHeader`), so the light palette is reachable.

### F21 — Header/nav overflows on mobile

- **severity:** S2 · **type:** CX-flaw
- **where:** `apps/web/src/features/auth/components/AuthHeader.tsx:36–59` — `Stack direction='row'`
  with no responsive collapse.
- **root cause:** Campaigns / Rulesets / username / sign-out wrap awkwardly under ~640px.
- **fix:** Responsive collapse to a menu under a breakpoint.
- **status:** resolved (PR #59) — `HeaderActions` + the action `Stack` now `flex-wrap justify-end`, so
  the items reflow onto multiple rows under ~640px instead of overflowing.

### F22 — No breadcrumbs / secondary nav across deep routes

- **severity:** S2 · **type:** CX-flaw
- **where:** app shell — only top-level links in `AuthHeader`.
- **root cause:** games → campaign → character → sheet has no in-app way back up a level; users lean
  on the browser back button.
- **fix:** Breadcrumb (or campaign-context sub-nav linking Crew/Clocks/Factions/Characters).
- **status:** resolved (PR #59) — a path-derived `Breadcrumbs` component (in the new `AppShell`)
  renders linked parent crumbs on deep routes (Campaigns → Campaign → Character / New character,
  Rulesets → Upload ruleset); id segments relabel to their kind.

### F56 — Characters are campaign-scoped; no portable "My Characters"

- **severity:** S2 · **type:** CX-flaw (product/structural gap) · **flagged P0 (`COMPETITIVE.md` #2)**
- **where:** characters are created at `/games/[gameId]/characters/new` and rows carry a `game_id`;
  there is no character that exists without a campaign and no way to move one between tables.
  `characters.findByPlayer(userId)` exists but every character still belongs to a game.
- **root cause:** the data model scopes characters under a game. For **Mode 1 ("sheet anywhere")** this
  is the biggest structural gap — a player can't build/own a character _before or without_ a campaign,
  or carry it to a new table. D&D Beyond's characters are campaign-independent and travel; ours don't.
- **fix:** **Shipped (BRD Phase 5 — portable characters).** Migration `00014` makes `characters.game_id`
  a **nullable pointer** (single active campaign / link-move), with `ON DELETE SET NULL`, the ruleset
  bound on the character (`original_ruleset_id`, backfilled), and `attach_character_to_game` /
  `detach_character` `SECURITY DEFINER` RPCs (ownership + membership + ruleset match). New routes:
  **`/characters`** (My Characters), **`/characters/new`** (ruleset picker → the existing wizard,
  standalone), **`/characters/[id]`** (standalone sheet — campaign-scoped sections hide). The standalone
  sheet offers **"Bring to a campaign"** (`AttachToCampaign`). Repo/service resolve the ruleset via the
  character binding and handle a null game; `CreateCharacterData.gameId` is optional + a `rulesetId`.
- **status:** fixed — Phase 5 (migration `00014` + `apps/web/src/app/characters/*` + attach) **+ Phase
  5b** (move + detach + clone — owner controls on the sheet via `AttachToCampaign`, "Duplicate" on My
  Characters; reuses the `00014` RPCs + `cloneCharacter`, no migration). _(Cross-ruleset adaptation —
  Phase 5c — remains open.)_

### F57 — Character sheet isn't phone-first for at-table / PbP use

- **severity:** S2 · **type:** CX-flaw · **flagged P0 (`COMPETITIVE.md` #3)**
- **where:** `apps/web/src/features/characters/components/CharacterSheet.tsx` (dense multi-section
  layout) — responsive but not optimized for a phone held during play.
- **root cause:** the core use is tracking _during_ play, often one-handed on a phone (live at the
  table, or checking a PbP game on mobile). The sheet is information-dense and tuned for desktop; the
  common in-play taps (stress / harm / XP / roll / resist / loadout) aren't laid out phone-first.
- **fix:** a mobile pass on the sheet — prioritize the in-play controls, collapse build detail,
  thumb-reachable primary actions. Design/responsive effort (no schema change).
- **status:** **open — first increment landed (backlog round E, 2026-07-11):** below `sm` the
  sheet reorders via flex `order-*` so the IN-PLAY sections come first (name card → Condition
  [stress/harm/vice/flashback] → Dice + campaign log → XP/loadout/gear → abilities → campaign
  controls; an opened editor stays last). Build detail was already collapse-friendly (abilities
  are `<details>`). Remaining for the full pass: thumb-reachable primary actions (sticky
  quick-bar), larger touch targets on the pips/dots, and a real device walkthrough.

### F58 — Full-reload flicker after every mutation; no optimism, no success toast

- **severity:** S2 · **type:** CX-flaw
- **where:** every write — tick a clock, save a loadout, start a score, update a character
  (`characters-store.updateCharacter`), campaign panel edits — calls `void load()` and re-fetches the
  whole surface. No optimistic update, no success confirmation.
- **root cause:** server state is hand-rolled (`useEffect`+`useState`+`getRepositories()` with a manual
  race-guard, ~11 copies, plus Zustand store loaders); mutations can only invalidate by full refetch.
- **fix:** the React Query migration (see `CODE-QUALITY.md` PR4) — `useMutation` with optimistic update
  - `invalidateQueries`, and a success toast via the notification store.
- **status:** **fixed** — the RQ data seam (#91–#100) replaced every `load()` refetch with targeted
  `invalidateQueries` (no more full-surface reload), and PR4c (@9a2ae67) mounted `NotificationToaster`
  so the notification store actually renders (the wizard's create toast now shows; silent sign-in/out
  `console.error` paths also raise a toast). _Deliberate deviation:_ optimistic updates + blanket
  success toasts were skipped — invalidation-refetch chosen for correctness; in-place updates are the
  feedback (see `CODE-QUALITY.md` C16).

### F61 — Critical resistance didn't clear 1 stress (RAW deviation)

- **severity:** S2 · **type:** FitD-gap
- **where:** `core/rules/dice.ts` `resistanceStress` floored at 0, conflating a crit (two+ 6s) with
  a single 6. RAW: _"if you get a critical result, you also clear 1 stress"_
  ([SRD, Resistance & Armor](https://bladesinthedark.com/resistance-armor)).
- **status:** **fixed (round-3 PR-4)** — `resistanceStress` returns **−1** on a crit; the engine's
  `applyStress` accepts negative deltas (clamped at 0); RollPanel/RollLog phrase it ("critical —
  cleared 1 stress") instead of rendering "-1 stress".

### F62 — One crew veteran grant unlocked unlimited cross-playbook picks

- **severity:** S2 · **type:** FitD-gap
- **where:** `core/rules/character-rules.ts` summed `veteran` effects but only checked `> 0` —
  a single grant unlocked ANY number of tier-2 cross-playbook abilities (bounded only by the
  ability-choice limit). RAW: each veteran advance = ONE ability from another playbook.
- **status:** **fixed (round-3 PR-4)** — veteran grants are a **budget**: held cross-playbook picks
  (tier ≥ 2, outside the playbook roster, no held prerequisite) must fit within the summed grants;
  `isAbilityUnlocked` offers a candidate only while a slot is free, and validation flags an
  over-budget set (`veteranPicksUsed` in character-rules).

### F69 — Bot action resolution read the WRONG field — no ruleset using the canonical shape worked

- **severity:** S1 · **type:** CX (found by the beta go-live smoke test, right after F68)
- **where:** `/roll action:` (resolve + autocomplete) and `/xp advance`'s action dots read the
  top-level `content.skills` DEFINITIONS and keyed ratings by skill id — but the canonical model
  (web sheet, wizard, `validateCharacter`) is **`rulesetActions(content)`**: action NAMES from
  `attributes[].skills`, ratings keyed by NAME. The default starter ruleset ships
  `content.skills: []` by design, so every sheet roll surface showed "no actions". The unit AND
  e2e fixtures had invented the id-keyed shape — real data never looked like that, and three
  phases of green tests proved a path production data can't take.
- **found by:** the operator's `/roll action:` on a fresh default-ruleset character (2026-07-04).
- **status:** **fixed** — resolve/autocomplete/advance all go through `rulesetActions` (names,
  case-insensitive match), fixtures and the e2e seed corrected to the real shape. Lesson (same
  family as F68): fixtures must mirror the production data shape, not a shape that merely
  satisfies the code under test.

### F68 — profiles.discord_id was never populated — the bot's account link was broken for EVERYONE

- **severity:** S1 · **type:** CX (found by the first real go-live smoke test)
- **where:** the column has been UNIQUE since `00001`, and the whole bot identity model
  ("web sign-in IS the link") rests on it — but NO code path ever wrote it: `handle_new_user`
  set only username/avatar, and `linkDiscordAccount` writes auth METADATA, not the profile
  column. Every real profile had `discord_id NULL`, so `resolveActor` → sign-in-first for every
  user. The e2e specs set the column by HAND (`admin.from('profiles').update({discord_id})`),
  which masked the gap through three phases of green tests.
- **found by:** the operator's first `/character use` on beta (2026-07-04).
- **status:** **fixed (migration `00019`)** — backfills existing profiles from their
  `auth.identities` Discord identity and teaches the trigger to capture `provider_id`/`sub` at
  signup (fill-if-null on conflict). Lesson recorded: an e2e that hand-seeds the very row a
  production trigger is supposed to create proves the READ path only.

### F86 — Bot lagged the web on crew advancement; harm rules absent from every roll surface (bot-parity round)

- **severity:** S2 · **type:** CX + FitD-gap (cross-client parity cluster) · **(2026-07-11)**
- **where / what:** (1) the engine's `markCrewXp`/`takeCrewAdvance` (F85) were web-only — no
  `/crew xp` or `/crew advance` subcommands, so a Discord-first table couldn't run crew
  advancement at all and couldn't even SEE crew XP; (2) the BitD harm penalties existed only as a
  doc comment (`domain/character.ts`) — neither the web `RollPanel` nor the bot's `/roll action:`
  applied or mentioned them (F43); (3) web harm edits bypassed the feed (F65).
- **fix / status:** **fixed (bot-parity round, 2026-07-11)** — `/crew xp [amount]` (add marks,
  negative unmarks, clamped to the 8-box track; a full track's reply points at `/crew advance`)
  and `/crew advance` (refuses a non-full track BEFORE any write, mirroring `/crew tier`); both
  feed-logged via the engine. `/heist help` + the README command table updated; `gm.test.ts`
  covers mark/clamp/refusal/reset. F43 + F65 fixed alongside (see their entries) — the two
  clients now agree on harm and crew advancement end-to-end.
- **residue:** ~~a signed e2e for `/crew xp` on the local stack~~ **closed (rerun round,
  2026-07-11)** — `discord.spec.ts` Act 3.7 drives `/crew xp amount:8` → resources hit 8/8 + a
  'crew' feed event, then `/crew advance` → track resets to 0 + the advance feed event. F66 is
  also fixed (see its entry) — no bot known-gaps remain.

### F85 — XP marking + crew XP: silent feeds, buried advance, two interaction models (XP-round cluster)

- **severity:** S2 · **type:** CX-flaw + FitD-consistency · **(2026-07-11 XP-experience pass)**
- **where / what (five sub-flaws, all verified):**
  (1) `CharacterSheet.setXp` wrote track XP directly (`useUpdateCharacterData`) with **no feed
  event**, while flat-mode "Add XP" and the bot's `/xp mark` logged one — the primary BitD path
  was the silent one (= F70c). (2) Crew XP had **no engine use-case at all**: `CrewAdvanceTrack`
  marks and the "Take advance" reset were raw `crews.update` writes — never reached the campaign
  log, unlike heat/tier/incarcerate. (3) "Take advance (reset XP)" was a **bare reset** — no link
  to actually picking a crew ability, no post-advance feedback. (4) A full character track showed
  a passive badge but **no way to act on it** — the spend hid behind Edit build → Advancement,
  explained only in prose. (5) Character XP used clickable boxes while crew XP used ± steppers —
  **two interaction models for one concept** — and both reused `StressTracker`, whose danger
  palette (red/pulse near full) reads as _bad news_ on an XP track that's actually filling with
  good news.
- **fix / status:** **fixed (XP round, 2026-07-11)** —
  • engine: `markCrewXp` + `takeCrewAdvance` use-cases (feed-logged; advance REFUSES a non-full
  track server-path-side), `updateAndLog` extended to `resources`; unit-tested in `engine.test.ts`.
  • web: sheet `setXp` → engine `markXp` (signed delta + track name in the log note); crew
  mark/advance → the new hooks (`useMarkCrewXp`/`useTakeCrewAdvance`); post-advance info notice
  ("pick a new crew ability below").
  • ui: new **`XpTrack`** component (packages/ui) — gold-on-earn square boxes (deliberately not
  the stress palette), per-box accessible names ("Mark N XP" / "Unmark — back to N"; the F84
  lesson applied), ready badge + CTA slot; story + unit tests. Used by BOTH `XpTracksCard` and
  `CrewAdvanceTrack`, so marking XP looks and works the same everywhere.
  • sheet: full track grows a **"Take advance"** CTA that opens the editor directly on the
  Advancement tab (editor accepts `initialSection`, scrolls into view); the card prose now names
  the CTA.
  • coverage: `XpTracksCard.test.tsx` + `CrewAdvanceTrack.test.tsx` (web), `XpTrack.test.tsx` +
  story (ui), `gm-xp-tracks.spec.ts` extended (feed events asserted for playbook + attribute
  marks, CTA presence), `gm-crew.spec.ts` gains a full crew mark→ready→advance→feed journey.
- **residue (open, small):** trigger shortcuts still cover only the playbook track (attribute
  triggers have no shortcut — RAW marks them via desperate rolls, a future roll-integration);
  no undo for a _logged_ mark beyond re-clicking the track.

### F84 — StressTracker pips are unlabeled buttons (no accessible name)

- **severity:** S3 · **type:** CX-flaw (a11y, F76 family) · **(found 2026-07-11 writing the F73 test)**
- **where:** `packages/ui/src/components/StressTracker.tsx` (~:116) — each stress pip is a
  `motion.button` with no `aria-label`/text; the F73 regression test had to select them by
  className. `ActionDots` (~:239) has the same shape.
- **root cause:** the pips were built as visual affordances; screen-reader/AT users get a row of
  anonymous buttons with no way to know which stress value each sets.
- **fix:** per-pip `aria-label` ("Set stress to N" / "Clear stress") + `aria-pressed` or a
  radiogroup pattern; then the F73 test can select by role+name. Fits the F76 axe-in-CI push.
- **status:** **fixed (rerun round, 2026-07-11)** — every pip in `StressTracker` AND `ActionDots`
  carries its action as the accessible name ("Set stress to N", the top filled pip "Clear stress
  to N−1"; dots scope by their row label — "Set Track to 1") plus `aria-pressed`. The F73 sheet
  test and the stress e2e steps (`gm-harm-stress`, `gm-resistance-downtime`) now select by
  role+name instead of className; unit-tested in `StressTracker.test.tsx`.

### F83 — `hidden sm:block` never un-hides: the ui stylesheet's duplicate utilities shadow app responsive rules

- **severity:** S3 · **type:** CX-flaw (styling footgun) · **(verified — caught by the footer/clickwrap e2e)**
- **where:** `apps/web/src/app/globals.css` imports `tailwindcss` then `@heist-mind/ui/styles`;
  the compiled `layout.css` ends up with the ui bundle's plain `.hidden` (line ~1300) AFTER the
  app's `@media .sm\:block` (~851). Equal specificity → the later `.hidden` wins at every
  width, so the `hidden sm:block` idiom silently never shows the element.
- **root cause:** two full utility layers in one page stylesheet (app Tailwind output + the ui
  package's prebuilt CSS), so base utilities from the second import outrank responsive variants
  from the first.
- **fix (workaround):** use width-scoped variants that don't rely on a base `hidden` —
  `max-sm:hidden` instead of `hidden sm:block` (applied in `AuthHeader`'s clickwrap). Real fix
  is deduping the double utility import; tracked here until someone takes that on.
- **status:** **fixed (backlog round E, 2026-07-11) — the REAL fix: one utility layer per
  page.** The ui package's stylesheet split into `theme.css` (tokens/`@theme`/component styles/
  `.light`+`.dark` — exported raw as `@heist-mind/ui/theme`) and the standalone compiled
  `./styles` (unchanged, for Storybook). The web app's `globals.css` now imports the THEME into
  its own single Tailwind pass and `@source`s `packages/ui/dist`, so every class the components
  use is generated once, in one ordered layer — no second base `.hidden` to shadow responsive
  variants. Verified: ui build emits both artifacts, Storybook still builds, and the anonymous
  e2e tier (home/legal/signin-gates — the specs that caught this) passes live. The
  `max-sm:hidden` workaround in `AuthHeader` still works and stays.

### F82 — Repo shipped Duskwall _setting_ content outside the CC BY grant (IP audit 2026-07-05)

- **severity:** S2 · **type:** IP/licensing (audit-found, not user-visible)
- **where:** the BitD builtin (`packages/shared/src/builtin-rulesets/blades-in-the-dark.ts`)
  shipped six named Doskvol factions (Bluecoats, Spirit Wardens, Lampblacks, Red Sashes, Crows,
  Circle of Flame), "Duskvol" in its description + catalog blurb, "electroplasmic" (×2) and a
  "spirit warden" contact; product copy used "Doskvol" (`auth.signIn.newUser`,
  `roleSelection.scoundrel.features`) and "Bluecoat"/"Lampblack" name placeholders; Brackwater
  leaked the setting term "sparkcraft" and 9 SRD-coincident ability display names against its
  "everything original" header; Storybook demos + e2e fixture names used setting names.
- **root cause:** the SRD's CC BY 3.0 grant covers the _system_ but excludes the Duskwall
  setting/NPCs/art/maps (bladesinthedark.com/licensing) — the setting layer was bolted onto an
  otherwise-clean system implementation. Wicked Ones CC0 claim externally verified true
  (Bandit Camp, Jan 2024); e2e ruleset fixtures (cinders/veil), migrations, and docs are clean.
- **fix:** PR #151 (shared: drop factions block, de-Duskvol description/blurb,
  spectral/ghost-hunter renames, Brackwater originality pass) + the web-copy reskin PR
  (en.json, seam fixtures, e2e campaign names, Storybook, design-tokens comment). Existing user
  DB copies are load-time snapshots — intentionally unaffected.
- **status:** fixed (PR #151 + web-copy reskin PR) — legal-pages series (/legal/\*, footer,
  clickwrap, upload attestation) tracks separately.

### F81 — "My Characters" is missing from the persistent nav

- **severity:** S4 · **type:** CX-flaw
- **where:** `apps/web/src/features/auth/components/AuthHeader.tsx` (~:54-57) — nav links are
  Campaigns + Rulesets only; `/characters` (a Phase-5 primary surface and the Mode-1 home) is
  reachable only via the dashboard section or breadcrumbs.
- **fix:** add a "My characters" link to the header nav (i18n key exists in `navigation.*` space).
- **status:** **fixed (CX round 2026-07-11)** — the authenticated header nav is now Campaigns ·
  Characters · Rulesets · Settings (`navigation.characters`); pinned by
  `e2e/specs/signin-gates.spec.ts` (banner link → `/characters` → "My characters" heading).

### F80 — UI primitives with zero or story-less coverage

- **severity:** S4 · **type:** CX-flaw (test-estate)
- **where:** `packages/ui` — `Select` and `Textarea` have **no unit test and no story** (used
  across the wizard and forms); the FitD gameplay primitives `Clock` (3 unit cases) and
  `HarmTracker` (2) have **no Storybook story**, so the CI smoke never renders the visual core of
  play; 15 of 23 components are unit-untested overall (floor 40/62/44/40 reflects it).
- **fix:** stories for Clock/HarmTracker/Select/Textarea first (smoke coverage is nearly free),
  then unit tests ratcheting the ui floor upward.
- **status:** **fixed (CX round 2026-07-11)** — CSF3 stories added for all four
  (`Select|Textarea|Clock|HarmTracker.stories.tsx`, auto-picked-up by the Storybook test-runner
  smoke) and unit tests for `Select` + `Textarea` (label association, aria-label fallback,
  error/aria-invalid, help-text describedby, resizable). The Textarea test caught a real defect:
  `helpText` leaked onto the DOM `<textarea>` via prop spread (React unknown-prop warning) — now
  destructured out. The broader "15 of 23 components unit-untested" ratchet remains future work.

### F79 — Dashboard content is never asserted, and two sections load without affordances

- **severity:** S4 · **type:** CX-flaw (+ test-estate)
- **where:** `e2e/specs/dashboard.spec.ts` asserts headings/chrome only — never that a user's
  campaigns/characters/activity actually render; the `dashboard` feature has no unit test; and
  `Dashboard.tsx` renders `loading ? null` for the Characters and Recent-activity sections (only
  Campaigns gets a spinner), so they pop in.
- **fix:** extend the spec to seed-and-assert real content on `/`; add loading affordances to the
  two sections.
- **status:** **fixed (CX round 2026-07-11)** — Characters + Recent-activity render a
  `LoadingSpinner` while loading (matching Campaigns, no more pop-in), and `dashboard.spec.ts`
  gained a local-stack test that seeds a campaign through the UI and asserts `/` really lists it,
  every section's spinner resolves (`role='status'` count → 0), and the activity section shows
  rows or its empty-state copy. (The `dashboard` feature still has no unit test — residue.)

### F78 — The deploy gate is blind to gameplay and the bot (all local-stack specs skip on deployed targets)

- **severity:** S3 · **type:** CX-flaw (test-estate)
- **where:** `greenlight-verify.yml` runs the suite against the deployed URL where
  `isLocalStack() === false`, so every `gm-*` gameplay spec self-skips; `discord.spec.ts` +
  `discord-parity.spec.ts` additionally need the local test keypair, so the LIVE `/api/discord`
  behavior on beta/prod is exercised only by the keyless posture check (unsigned → 401).
- **root cause:** data-mutating specs need the per-env schema + admin provisioning that only the
  local stack guarantees; the bot specs can't sign for the real Discord apps.
- **fix (incremental):** a small deployed-safe smoke tier — read-only gameplay assertions against
  seeded beta data + the existing posture check; longer term, a beta-scoped persona pool enabling
  one thin write-path spec on the deploy gate.
- **status:** **open (updated, backlog round 2026-07-11)** — the public deployed tier has grown
  this session without needing the stack: `signin-gates.spec.ts` (six gated routes),
  `discord-page.spec.ts`, `auth-callback.spec.ts`, and `dashboard.spec.ts`'s anonymous
  assertions all run against a deployed URL. The remaining residue is unchanged and real:
  nothing on the deploy gate exercises an authenticated write path (needs the beta-scoped
  persona pool) and the live `/api/discord` is still posture-check-only. Kept open at S3 for
  that residue, not for the (now covered) read-only surface.

### F77 — Hub fortune roll + record-result affordance contradicts the journey text (decide: gate or relabel)

- **severity:** S4 · **type:** CX-flaw
- **where:** `apps/web/src/app/games/[gameId]/page.tsx` renders `RollPanel` (fortune) and
  `AddResultForm` unconditionally to every member, while every sibling panel gates writes by
  `game.createdBy === user?.id`; `CX-MAP.md` J3 step 5 says "GM makes fortune/GM rolls from the hub".
- **root cause:** Never decided. Note the bot's parity: `/fortune` is open to everyone and `/log`
  is member-gated — so the current web behavior matches the bot, and the JOURNEY text may be what's
  wrong.
- **fix:** Decide once: either gate the hub fortune panel to the GM, or (likelier, for bot parity)
  keep it member-open and reword the section label + J3 so a player rolling fortune isn't off-map.
- **status:** **resolved (rerun round, 2026-07-11) — DECIDED: member-open, for bot parity.**
  `/fortune` is open to everyone in Discord, so the web hub matches. The section copy now says so
  ("Fortune roll — anyone at the table…", `game.fortuneRoll`) and J3 step 5 reads "Anyone rolls
  fortune from the hub", with the decision recorded inline. No gating change.

### F76 — Accessibility is never enforced in CI (stories are render-only; no axe anywhere)

- **severity:** S3 · **type:** CX-flaw (test-estate)
- **where:** `packages/ui` — 0 `play:` functions across all 18 story files; `test-runner-jest.config.js`
  has no `checkA11y`/axe hook (only retry config); `@storybook/addon-a11y` is dev-panel-only; no
  `jest-axe` usage anywhere in unit tests.
- **root cause:** The Storybook smoke (audit PR 8) is a mount-smoke — it catches "story throws" but
  asserts no interaction and no a11y. Keyboard/contrast/ARIA regressions (the F1/F41 class) ship green.
- **fix:** Add axe assertions to the test-runner (`postVisit` + `checkA11y`, error mode on a curated
  rule set) and/or `play` functions for the interactive primitives (Select, Tooltip, ThemeToggle).
- **status:** **fixed (backlog round 2026-07-11)** — `packages/ui/.storybook/test-runner.ts` now
  runs axe on EVERY story (`preVisit` injectAxe → `postVisit` checkA11y via `axe-playwright`), so
  the CI story smoke (190 stories) gates on a11y. Curated exclusions, each with a reason in the
  config: the four fragment-vs-page rules (`region`, `landmark-one-main`, `page-has-heading-one`,
  `bypass` — stories are components, not documents) and `color-contrast` (theme-wide palette debt,
  tracked as **F87**). First enforcement pass fixed 12 stories' real violations (icon-only buttons
  without aria-labels in Button/Tooltip/Header stories, unassociated form labels in
  ErrorDisplay/Stack stories, duplicate banner landmarks in the Header galleries, heading-order in
  Theme/Container stories, an unfocusable scroll region in Section) **and one component bug:
  `Container` defaulted every plain layout div to an unnamed `role='region'` landmark — removed;
  the `asMain`/`asSection`/`asArticle` props (which never changed the rendered element) now map to
  real ARIA roles.** Verified locally: 190/190 pass through `test-storybook:ci`.

### F75 — Player-perspective and RLS tenant-isolation e2e are fixme scaffolds — two headline guarantees unproven

- **severity:** S2 · **type:** CX-flaw (test-estate)
- **where:** `e2e/specs/player-characters.spec.ts` and `e2e/specs/tenant-isolation.spec.ts` — every
  test is `test.fixme(...)` asserting only `expect(page).toBeTruthy()`.
- **root cause:** Scaffolded and never built. Every gameplay spec drives `gmPage`; a Player's
  join→build→play→advance path is exercised only as far as `join-via-code`'s membership check, and
  the CLAUDE.md security headline ("multi-tenant isolation via RLS") has zero executing assertions —
  a data-leak regression would ship green.
- **fix:** Implement both specs on the existing `playerPage` fixture: (a) player joins, creates a
  rules-valid character, rolls, advances; (b) player B cannot read GM A's unrelated campaign objects,
  and member writes to GM-gated objects are refused.
- **status:** **fixed (backlog round 2026-07-11)** — both scaffolds are real specs (4 tests,
  local-stack gated like the other journey specs; CI executes them). `player-characters.spec.ts`:
  one sequential player journey — join via code (the built front door; first-class invites are F5),
  create a rules-valid cinders character, roll from the sheet, bank XP, hard-reload to prove
  persistence, and the GM sees the player's activity on the shared log. `tenant-isolation.spec.ts`:
  (1) a non-member sees neither the campaign in their list nor anything at its direct URL ("Game
  not found" — RLS can't even distinguish not-yours from not-there); (2) a bogus join code is
  refused; (3) a joined member gets the hub but NONE of the GM-gated controls (state select,
  join-code management, clock creation), with a same-page GM-side control assertion guarding
  against label drift.

### F74 — Hub panels flash their empty state during the initial load

- **severity:** S4 · **type:** CX-flaw
- **where:** `ClocksPanel.tsx` (~:56), `FactionsPanel.tsx` (~:76), `ScorePanel.tsx` (~:80/:92) render
  "No clocks/factions/score yet" with no `isLoading` guard; `CrewSheet.tsx` (~:79) shows the correct
  loading pattern.
- **root cause:** Empty-state branch keyed on `data.length === 0` before the first fetch resolves.
- **fix:** Mirror CrewSheet: loading branch before the empty branch on the three panels.
- **status:** **fixed (CX round 2026-07-11)** — all three panels early-return a muted
  "Loading clocks/factions/scores…" placeholder (new `components.*Panel.loading` keys) while their
  query's `isLoading` is true, mirroring `CrewSheet`.

### F73 — A transient inline-edit error replaces the whole character sheet

- **severity:** S3 · **type:** CX-flaw
- **where:** `apps/web/src/features/characters/components/CharacterSheet.tsx:164` — the shared
  `error` state set by ANY inline mutation's `onError` (stress nudge, rename, add/mark XP, indulge
  vice) makes the page render `ErrorDisplay` instead of the sheet; recovery is a full reload. The
  code comment even flags it ("unchanged from the pre-seam behavior").
- **root cause:** One error state serves both load failures (where a page-level error is right) and
  inline-save failures (where in-place feedback is right — the F58 principle).
- **fix:** Split the states: load errors keep the page swap; mutation errors render a dismissible
  inline Alert (or the notification store) and leave the sheet interactive.
- **status:** **fixed (CX round 2026-07-11)** — the shared `error` became `saveError`: every
  inline mutation's `onError` now feeds a dismissible destructive `Alert` at the top of the sheet
  (sheet stays mounted + interactive); only a thrown query / not-found swaps the page for
  `ErrorDisplay`. Regression-tested in
  `apps/web/src/features/characters/components/__tests__/CharacterSheet.test.tsx` (seam mocked,
  real `DEFAULT_RULESET` content per the fixture-provenance rule).

### F72 — Six secondary routes still show bare "please sign in" text with no CTA (F39 residue)

- **severity:** S3 · **type:** CX-flaw
- **where:** signed-out branches of `games/new/page.tsx` (~:27), `games/[gameId]/characters/new`
  (~:27), `games/[gameId]/characters/[characterId]` (~:28), `characters/new/page.tsx` (~:41),
  `characters/[characterId]/page.tsx` (~:34), `rulesets/new/page.tsx` (~:38) — each renders a bare
  `<Text variant='muted'>` prompt while `SignInGate` (heading + value prop + Discord button) exists
  and is used on the four primary routes.
- **root cause:** F39 was fixed for `/games`, `/rulesets`, `/characters`, `/games/[id]` and the
  fix never propagated to the secondary routes.
- **fix:** Swap all six branches to `SignInGate` (mechanical; component already exists).
- **status:** **fixed (CX round 2026-07-11)** — all six routes early-return `SignInGate`
  (page-title headings passed where the page has one: create-campaign, new-character,
  upload-ruleset). Pinned by the new `e2e/specs/signin-gates.spec.ts`: each route, anonymous,
  must show the gate's Discord CTA + clickwrap (coming-soon-gate tolerant).

### F71 — Knip first-run triage backlog (advisory until clean)

- **severity:** S4 · **type:** CX (tooling)
- **where:** the audit round added `knip` (root script + ADVISORY CI step, `continue-on-error`).
  Its first run flags real finds mixed with resolver noise — notably `useApplyCharacterStress`
  (dead web mutation), two unused web lib files, and a batch of dependency/exports flags that
  need per-item verdicts (the Radix "unused dependency" wall in `packages/ui` looks like a
  resolver false-positive family).
- **status:** **fixed (backlog round 2026-07-11)** — the full triage landed and the CI step is
  now BLOCKING (no `continue-on-error`). Verdicts: deleted the dead code (web `design-tokens.ts` +
  `i18n/server.ts`, `useApplyCharacterStress`, `useUpdateClock`, discord `ownsCharacter`, ui
  `useDebouncedCallback` + `DebounceOptions`); pruned verified-unused deps (5 from `apps/web`
  incl. the whole `@supabase/auth-ui-*` family, 19 from `packages/ui` — the Radix wall was NOT a
  false-positive family: only `react-tooltip` and `react-slot` are imported); encoded the
  keep-verdicts in `knip.json` (generated `supabase-types.ts`, ui type barrels, i18n dynamic
  surface) with per-workspace scoping. `pnpm exec knip` exits 0 with zero findings AND zero
  configuration hints.

### F70 — Audit round log-only piping residue (read-never-written / written-never-read)

- **severity:** S4 · **type:** CX (data-piping hygiene, F68/F69 family — deliberately NOT fixed)
- **where:** (a) `characters.adaptations` + `characters.is_template` are read by the adapter but
  have no write path — Phase-5c placeholders; revisit when 5c lands or delete then.
  (b) `CharacterData.items` is seeded `[]` at creation (`creation-steps.ts`) and never read —
  superseded by `loadout.items`. (c) ~~web `setXp` (CharacterSheet) writes XP tracks WITHOUT an
  'xp' feed event~~ — **(c) fixed in the XP round (2026-07-11, see F85):** the sheet's track
  marking now goes through engine `markXp` (signed delta + track), so every web XP mark logs the
  same 'xp' feed event the bot's `/xp mark` does. (a) and (b) remain the intentional leftovers.
- **status:** **closed — logged by design (backlog round E, 2026-07-11).** (c) was fixed by the
  XP round; (a) `adaptations`/`is_template` are documented Phase-5c placeholders whose fate is
  owned by that phase (wire or delete WHEN 5c lands — nothing to do until then), and (b) the
  vestigial `CharacterData.items` seed is inert (never read; `loadout.items` is the real
  surface) and removing it is a data-shape migration with zero user value. Both stay documented
  here as the reference; neither is actionable backlog. The P1–P4/P7/P8 siblings were fixed in
  the audit round (#136–#141+).

### F67 — No player-facing web page documents the Discord bot

- **severity:** S3 · **type:** CX
- **where:** the landing page's play-by-post track now names the live bot, and `/heist help` is the
  in-Discord reference — but the web app has no page a GM can send players ("install the app / sign
  in once / `/character use`"), and no install ("Add to server") link anywhere.
- **status:** **fixed (bot-parity round, 2026-07-11)** — public **`/discord`** page
  (`DiscordGuideContent`, legal-page pattern): the two-sentence pitch, a 3-step getting-started
  (dice first → one web sign-in IS the link → `/character use` + linked-channel logging), and the
  full command reference mirroring `/heist help` + the README table (incl. the new
  `/crew xp|advance`). Linked from the landing's play-by-post track ("How the bot works →").
  Covered by `e2e/specs/discord-page.spec.ts` (anonymous, coming-soon-tolerant; verified live).
  _Residue:_ the app-directory "Add to server" install link still waits on the prod Discord app.

### F66 — A thread under a CATEGORY-linked parent doesn't resolve the link

- **severity:** S3 · **type:** CX (bot phase-2 known gap, now user-visible)
- **where:** link resolution uses the interaction's `channel.id` + `channel.parent_id`. In a thread,
  `parent_id` is the parent CHANNEL — so channel links resolve fine from threads, but when only the
  channel's **category** is linked, the category id isn't in the payload and `/roll`/`/log` in the
  thread say "not linked". Needs one bot-token channel fetch (the first bot-token call in the app)
  or a cached channel→category map.
- **status:** **fixed (rerun round, 2026-07-11)** — `resolveLinkedGame` gained an optional retry:
  when the payload candidates miss AND the interaction channel is a THREAD (types 10/11/12), one
  bot-token REST fetch (`makeChannelParentFetcher`, the app's FIRST bot-token call — wired in the
  transport from `DISCORD_BOT_TOKEN`) resolves the parent channel's category and the lookup
  retries with it. Best-effort by design: no token / failed fetch / no match degrades to the old
  "not linked". All seven `resolveLinkedGame` call sites pass `ctx.fetchChannelParent`.
  Unit-tested in the new `links.test.ts` (retry hits, payload-resolves-skips-fetch, non-thread
  skips, degradation matrix).

### F65 — Web harm edits still bypass the campaign feed (R-E1 residue)

- **severity:** S3 · **type:** CX
- **where:** the bot's `/harm take|clear` logs `harm` feed events via engine `takeHarm`/`clearHarm`
  (phase-3), but the web sheet edits harm only inside the full editor's batch `saveBuild`
  (`HarmCard` `onPatch` → whole-`characterData` write) — no feed event, no RAW escalation. The two
  clients now behave differently for the same action.
- **status:** **fixed (bot-parity round, 2026-07-11)** — the sheet's Condition card grew one-tap
  harm moves through the SAME engine use-cases the bot drives: a **"Take harm"** row
  (description + level, RAW escalation past full tracks with an inline "escalated to X" notice)
  and **click-the-wound-to-clear** (ui `HarmTracker` gained an optional `onClearEntry` — filled
  boxes become accessible clear buttons; story variant + unit tests). Both write via new
  `useTakeHarm`/`useClearHarm` hooks and land `harm` feed events — R-E1 closed for harm
  end-to-end. The editor's batch harm editing remains for build corrections. Covered by
  `cards.test.tsx` (quick mode) + the new `gm-harm-stress.spec.ts` journey (take → feed →
  penalty → clear → feed). `discord-parity.spec.ts` keeps the cross-client half.

### F64 — Zero-dice resistance computed stress from the HIGHEST die (should be lowest)

- **severity:** S2 · **type:** FitD-gap
- **where:** `core/rules/dice.ts` `resistanceStress` always used `Math.max(...results)`, but a
  0-attribute resistance rolls 2d and takes the **LOWEST** (the same zero-dice rule `rollOutcome`
  applies). A `[1, 6]` zero-dice resist was computed as _free_ instead of **5 stress** — and two
  6s on 0d even "crit-cleared". Affected core → engine (`rollResistance`) → web (`RollLog`
  display) → bot, since round 1.
- **found by:** the Discord bot's local signed-POST harness on `/resist dice:0` (bot phase-0
  PR-2 manual verification).
- **status:** **fixed (bot phase-0 PR-2)** — `resistanceStress(results, { zeroDice })` takes the
  lowest and never crits on 0d; engine forwards its input's `zeroDice`; RollLog infers it from
  `r.dice === 0`; covered in core/engine/bot tests.

### F63 — Heat "remainder carry" flagged as a deviation — REFUTED, it is RAW

- **severity:** S4 · **type:** FitD-gap (audit correction)
- **where:** the round-3 review claimed `crews.ts` `applyHeat` deviates from RAW by carrying excess
  heat past a wanted-level increment. The SRD says the opposite: excess heat **rolls over** ("if
  your heat was 7 and you took 4 heat, you'd reset with 2 heat marked" —
  [SRD, Heat](https://bladesinthedark.com/heat)).
- **status:** **closed — no change**; the implementation was already correct. Kept as a reminder to
  verify rule claims against the SRD before "fixing" them.

---

## S3 — minor

### F87 — The ember/noir palette fails WCAG AA contrast across ~80 story surfaces (found by the F76 axe gate, 2026-07-11)

- **severity:** S3 · **type:** CX-flaw (a11y, design tokens)
- **where:** package-wide — the first F76 axe sweep flagged `color-contrast` (serious) on ~80 of
  190 stories / ~223 nodes: `text-foreground-muted` + `text-foreground-secondary` on the dark
  backgrounds, ghost/outline button text, badge variants, muted text inside `bg-background-secondary`
  cards. Not a story problem — the design tokens themselves sit below 4.5:1.
- **root cause:** The palette was tuned for atmosphere, never against a contrast budget. Nothing
  gated it (F76), so it spread everywhere the muted/secondary tokens are used.
- **fix:** A design-token pass: retune `foreground-muted`/`foreground-secondary` (and the ghost
  button + badge text colors) against their real backgrounds to ≥4.5:1 (AA), then delete the
  `color-contrast` exclusion in `packages/ui/.storybook/test-runner.ts` so the axe gate holds the
  line. Token-level change — every consumer inherits the fix.
- **status:** open (the exclusion in the test-runner config points here)

- **F23** · CX · Sheet attributes are a creation-time snapshot, not re-derived from current action
  ratings; the editor still exposes them as directly editable (dead data, since the validator skips
  attribute caps in action mode). `CharacterSheet.tsx:146`, `CharacterEditor.tsx` (~231–250),
  `character-rules.ts` (~337). **(verified)** → derive on the sheet; hide/lock attributes in
  action-rating mode. **fixed (backlog round E, 2026-07-11)** — on action-rating rulesets the
  sheet DERIVES attributes live (`deriveAttributes`, all shown incl. 0 = zero-dice resist, with a
  "derived from action ratings" note); the editor's Build tab shows them as locked badges pointing
  at Advancement instead of editable trackers; and `RollPanel` grew an `attributes` prop so
  RESISTANCE rolls the attribute (RAW), not an action rating — the sheet passes derived (or
  stored, on point-buy rulesets) values. e2e: derived-note assertion in `gm-loadout.spec.ts`.
- **F24** · CX · ActionRatingsStep doesn't explain attributes are _derived_ (count of actions ≥1).
  `ActionRatingsStep.tsx:34,50–52` → one-line helper text. **fixed** — a muted helper above the
  attribute cards explains the rating = its actions rated 1+ (and that it's the resistance dice).
- **F25** · CX · Playbook cards show only name+description — no stat/ability preview to choose on.
  `PlaybookStep.tsx:42–56` → show starting abilities/actions on the card. **fixed** — each card now
  shows seeded action dots (badges) + the starting ability by name.
- **F26** · CX · Starting vs optional abilities aren't visually distinguished. `AbilitiesStep.tsx`
  (`roster` vs `others` rendered identically) → a "Starting"/section header. **fixed** — the roster
  is labelled "{playbook}'s abilities" and the expanded others get a "From other playbooks" header.
- **F27** · CX · Re-selecting a playbook silently resets abilities/attributes.
  `character-creation-store.ts:135–154` `setPlaybook` → warn/confirm before reset. **fixed
  (backlog round A, 2026-07-11)** — switching away from a chosen playbook is two-click: the first
  arms a warning alert naming the reset ("dots and ability picks reset — click again"), the second
  commits. First pick / re-click never warns.
- **F28** · CX · Cancelling the wizard gives no "draft saved" reassurance (it _is_ persisted).
  `CharacterCreationWizard.tsx:123–124` → confirm + reassure copy. **fixed (backlog round A,
  2026-07-11)** — the footer Cancel is two-click; armed it reads "Leave? Draft saved — click
  again" (disarms on blur), naming exactly the reassurance the persisted draft earns.
- **F29** · CX · Required name field has no visual required indicator.
  `CharacterCreationWizard.tsx:83` → asterisk/marker. **fixed (already)** — the shared `Input`
  renders a red `*` after the label when `required` (Input.tsx:224); the name field passes `required`.
- **F30** · FitD · Clock completion isn't visually indicated; 4/4 looks like 3/4. `clockComplete()`
  in `clocks.ts` is never called by `ClocksPanel.tsx` → render a complete state. **fixed @4b7343e
  (PR #59)** — full clocks show a "Complete" badge + glow.
- **F31** · CX · Roll-log shows `risky/` (trailing slash, empty effect) when position is set but
  effect isn't. `RollLog.tsx:49`. **(verified)** → only join when both exist. **fixed @4b7343e
  (PR #59)** — position/effect now joined with a slash only when both are present.
- **F32** · CX · Game `state` (draft/recruiting/active/paused/completed) is shown as a badge with no
  legend and no way to change it. `games/page.tsx:81` → lifecycle control + tooltip. **fixed
  (backlog round A, 2026-07-11)** — the campaign hub header now gives the GM a "Campaign state"
  `Select` over the five lifecycle states (new `useUpdateGameState` seam hook over the repo's
  existing `updateState`; members see the tooltip'd badge). Covered in `gm-games.spec.ts`
  (change → reload → persisted).
- **F33** · CX · Crew `hold` (strong/weak) shown + toggle with no explanation. `CrewSheet.tsx:172–182`
  → tooltip. **fixed @4b7343e (PR #59)** — hold has an explanatory tooltip (strong = stable, weak =
  one setback from breaking up).
- **F34** · CX · Faction tier (0–6) and status (−3..+3) caps aren't labelled; buttons just disable at
  the ends. `FactionsPanel.tsx:190–246` → show "Tier x/6", a status legend. **fixed @4b7343e
  (PR #59)** — tier now labelled "Tier n/6" and status carries a −3..+3 legend tooltip.
- **F35** · CX · Ruleset upload gave no schema/example guidance; validation errors assumed JSON
  fluency. Added a guidance card outlining the required/optional shape + pointing to the starter
  catalog as the no-JSON path. `RulesetUpload.tsx`. **fixed @69180e1**
- **F36** · CX · "Load the Brackwater starter ruleset" label was ambiguous (load? download? copy?).
  Now "Add &lt;name&gt; to my rulesets" with a clarifying tooltip, across the whole built-in catalog.
  `LoadBuiltinRulesetButton.tsx`. **fixed @69180e1**
- **F37** · CX · No first-run onboarding: a new signed-in user with no rulesets/games gets no guided
  next step. **fixed (round-3 PR-6)** — the ruleset-prerequisite wall is gone: `/characters/new` and
  `/games/new` embed the built-in catalog inline (`StarterCatalogInline` — one click loads a starter
  and CONTINUES IN PLACE into the wizard / form, no `/rulesets` detour), and the dashboard shows a
  guided "Start here" 1-2-3 (build a character · create a campaign · join a game) for a user with
  nothing. Covered by the `inline starter catalog` E2E spec.
- **F38** · CX · Landing doesn't convey the async play-by-post value prop or FitD specifics.
  `app/page.tsx:28–34` → messaging + an "async play" feature. **fixed (PR #59)** — hero + the three
  feature cards + CTA now lead with async, Discord-style play-by-post (rulesets, shared rolls/clocks/
  crews, join codes, downtime); copy stays in the existing `pages.landing.*` keys.
- **F39** · CX · Auth-gated pages show sparse "Please sign in" text with no CTA. `games/page.tsx`,
  `rulesets/page.tsx`, `games/new` → styled empty state + Sign-in button. **fixed @PR59 (games +
  rulesets)** — the auth gate is now a `Card` with a heading, a value-prop line, and a "Sign in with
  Discord" button (`signInWithProvider('discord')`); `games/new` still bare.
- **F40** · CX · Auth-callback errors auto-redirect after ~2s (hard to read) and home doesn't surface
  `?error=auth_failed`. `auth/callback/page.tsx:29–46` → longer/explicit retry + a home banner.
  **fixed (backlog round A, 2026-07-11)** — the callback holds the error for 6s (readable), and
  home now surfaces `?error=auth_failed|auth_timeout` as a dismissible banner pointing at the
  header's Sign In retry (`AuthErrorBanner`, Suspense-wrapped for the prerendered route).
  `auth-callback.spec.ts` extended (banner shown → dismissed) and verified live in a browser.
- **F41** · CX · No skip-to-main link; sticky header makes keyboard users tab through all nav.
  `packages/ui/src/components/Header.tsx` → skip link + `id="main-content"`. **fixed @d9d7d49 (PR #59)**
  — `AppShell` renders a focus-revealed skip link targeting the single `<main id="main-content">`.
- **F42** · CX · Sheet doesn't distinguish GM vs player edit affordances (controls shown regardless;
  RLS blocks server-side, but the UI invites dead actions). `CharacterSheet.tsx`, `CharacterEditor.tsx`
  → gate interactive controls by role/ownership. **fixed** (PR5, code-quality Tier 4) — the sheet
  computes `canEdit` mirroring the RLS policy (owner OR the campaign's GM) and gates rename,
  edit-build, the stress tracker, indulge vice, XP marking, and the loadout save; other members see
  a read-only sheet. (The campaign panels — crew/clocks/factions/scores — were already `isGm`-gated.)
- **F43** · FitD · Harm penalties (−1d / reduced effect at moderate, incapacitated at severe) aren't
  applied or surfaced on rolls. `RollPanel.tsx` has no harm input → show harm + default
  effect/limit. **fixed (bot-parity round, 2026-07-11)** — RAW corrected to the SRD (level 1 =
  reduced effect, level 2 = −1d, level 3 = incapacitated): new core `worstHarmLevel` +
  `harmDicePenalty` (same-kind penalties never stack; unit-tested). BOTH clients apply the −1d on
  action rolls: web `RollPanel` (auto, with a "Waive harm penalty" toggle + level hints; the feed
  note names the malus) and the bot's `/roll action:` (title shows `−1d`, note "−1d (moderate
  harm)"; severe adds "needs help or a push"). Effect reduction / incapacitation stay surfaced as
  hints — position/effect remain the table's call. Covered by `roll-pool.test.ts`,
  `roll.sheet.test.ts`, and the `gm-harm-stress.spec.ts` journey.
- **F44** · FitD · Armor has no mechanical effect (harm reduction / heavy −1d). loadout carries armor
  but rolls/harm ignore it → "spend armor" to reduce harm; heavy-armor note. **fixed (backlog
  round E, 2026-07-11)** — the SPEND-ARMOR move, engine-first: `CharacterLoadout.armorSpent`
  tracks the boxes expended this score (a fresh loadout refreshes them, matching RAW per-score
  armor); core `isArmorItem`/`availableArmor` find carried unspent armor (SRD-family naming
  convention, "armour" included); engine `takeHarm` gained `spendArmor` — the harm drops ONE
  level before landing (lesser → absorbed outright, `appliedLevel: null`), no armor →
  `NO_ARMOR`. Both clients drive it: the sheet's harm quick-row grew an armed "Spend armor
  (n left)" toggle with absorbed/lightened notices, and the bot's `/harm take` grew an `armor`
  boolean (+ absorbed/no-armor copy, help line). Unit-tested at all three layers (core rules,
  engine, bot handler); e2e journey in `gm-loadout.spec.ts` (arm → moderate lands lesser →
  toggle gone → feed carries the lightened level).
- **F45** · FitD · Load level is character-static, not chosen per score. `CharacterLoadout.level` is
  baked in → allow per-score load choice when a score/heist entity exists. **fixed/superseded**
  (verified 2026-07-05 audit): `LoadoutCard.tsx:130-144` offers light/normal/heavy per score.
- **F46** · FitD · Fortune rolls lack structured types (engagement / gather-info / situation) and
  tiered readouts. `RollPanel.tsx:131–143` → a fortune-type selector + interpretation. **fixed
  (backlog round C, 2026-07-11)** — fortune mode gained a type selector (Fortune / Engagement /
  Gather information; the type becomes the feed label) and a tiered SRD-phrased reading under the
  result (crit exceptional · 6 good · 4–5 mixed · 1–3 poor).
- **F47** · FitD · Faction projects/clocks and the war state (status −3) aren't surfaced; `Clock`
  already supports `linked*`. `FactionsPanel.tsx` → link faction clocks; show "at war". **fixed
  (backlog round A, 2026-07-11)** — per-faction project clocks had already shipped
  (`FactionsPanel` renders `linkedType==='faction'` `ClockTile`s + a GM add form); the missing
  piece was the WAR callout: status ≤ −3 now shows an explicit red "At war — the crew loses its
  downtime safety and every score runs hotter" line beside the badge.
- **F48** · FitD · Contacts have no mechanical tie-in (bonds/leverage/"call on a contact").
  `domain-types.ts` contacts + `CharacterSheet.tsx:369–407` display only → optional contact-aid hook.
  **closed — by design (backlog round E, 2026-07-11).** Contacts DID get their CX fix: the wizard
  picks friend/rival from the playbook roster and the sheet shows them (F12, round C). The
  remaining "mechanical tie-in" is deliberately out: RAW, calling on a contact is a fiction move
  the GM prices per situation (a fortune roll, a favor, a downtime action — all of which the app
  already offers à la carte); there is no fixed rule for the tracker to enforce, and inventing
  one would violate the core-value principle (BRD: never automate a table conversation). Reopen
  only if a ruleset ships STRUCTURED contact mechanics for the engine to model.
- **F49** · FitD · Indulge-vice (clear stress) has no affordance even though vice is captured.
  **fixed (stale — closed on verification, backlog round A)**: the sheet has had "Indulge vice
  (clear stress)" through engine `indulgeVice` since the F15 MVP; e2e-covered in
  `gm-resistance-downtime.spec.ts`. The entry simply never got flipped.
- **F50** · FitD · Ability tier-gating has no advancement path. **fixed (stale — closed on
  verification, backlog round A)**: play-time unlocks exist via the veteran budget
  (`isAbilityUnlocked` + `veteranPicksUsed`, F62) and crew-aware validation (F54 WS); the old
  crew-tier TODO is gone from `character-rules.ts`.
- **F51** · FitD · No score/heist entity grouping a job's rolls/clocks/downtime. **fixed (stale —
  closed on verification, backlog round A)**: the Score entity shipped as BRD Phase 1
  (`ScorePanel` lifecycle; `RollLog` groups the feed by `scoreId` with per-score headers).
- **F52** · CX · No post-roll consequence scaffolding (a partial/bad result doesn't prompt the GM to
  tick a clock / add heat / harm). `RollPanel.tsx:149–155` → a "consequences" quick-action card
  linked to the roll. **fixed (backlog round C, 2026-07-11)** — a partial/bad ACTION result now
  raises a consequences hint naming the GM levers (tick a clock, add heat, deal harm — the sheet's
  one-tap harm is right below) with a "Resist a consequence" button that flips the panel straight
  into resistance mode.
- **F55** · scope · Popular FitD games not yet offered as built-ins because the engine can't model
  their distinctive mechanics. The built-in catalog (`packages/shared/src/builtin-rulesets/`) ships
  Brackwater + Blades in the Dark (drop-in) + Wicked Ones (dungeon-as-crew + `crew.resourcePools`).
  Deferred, each needing real engine work: **Scum & Villainy / Beam Saber** (ship/mech as crew type
  works, but they're Evil Hat-protected content → need original reskins + the gambit pool, already
  enabled by `resourcePools`); **Band of Blades** (a Legion _roster_ of many soldiers — breaks the
  one-crew/one-PC model); **Girl by Moonlight** (transformation/eclipse + promises — no
  `CharacterData`/roll-loop home); **The Wildsea** (non-FitD dice: count 6s, no position/effect);
  **Slugblaster** (Style/Stuff/Bull token economy). The major-gap items co-require open roll-loop
  findings (F3, F9, F10, F14, F15). Treat each as its own future epic, not a data-only add.
  **closed — deferred by design (backlog round E, 2026-07-11).** This is a PRODUCT-ROADMAP list,
  not a CX flaw this backlog can burn down: each entry is its own engine epic (new mechanics,
  new data models, in two cases licensing work) that the BRD's phased plan owns. Keeping it
  open here made the findings log read permanently unfinished for work that was never
  in its scope. The catalog analysis above stays as the reference for whichever epic gets
  picked up first.
- **F59** · CX/a11y · No design-system `<Select>`; raw `<select>` in ~9 files with a copy-pasted
  className and inconsistent labelling (RollPanel uses `aria-label` only; others wrap a bare `<label>`).
  → a `packages/ui` `<Select>` with a real associated `<label>` + shared token (see `CODE-QUALITY.md`
  PR3). **fixed @bebe87f** — `packages/ui/src/components/Select.tsx` (label/aria-label + token);
  all 9 raw selects migrated, the copy-pasted `sel` className removed.
- **F60** · CX · Clarity/consistency cluster. **fixed (backlog round B, 2026-07-11)** — the
  cluster's items, closed: panel errors now lead with a friendly line and carry the raw repo
  message as detail (`CrewSheet`/`FactionsPanel`/`ScorePanel`); the built-in catalog flags copies
  you already own ("In your rulesets" badge, CTA becomes "Refresh my copy" — `StarterCatalogInline`
  checks the owned list); the `/characters/new` ruleset picker shows each ruleset's one-line
  description; a standalone sheet opens with a "Standalone character — not in a campaign yet"
  banner; indulge-vice is a two-click confirm ("Roll it? Click again"); duplicating a character
  fires a success toast. Context-less "Loading…" spinners were fixed with F74's per-panel loading
  copy. _Residue (tracked here, small):_ button loading-state consistency and an in-app FitD
  glossary beyond the position/effect tooltips.

---

## S4 — polish

- **F53** · CX · ActionRatingsStep badge repeats the attribute name ("Insight" header + "Insight 2"
  badge). `ActionRatingsStep.tsx:51` → show just the number. **fixed (backlog round A,
  2026-07-11)** — badge shows just the number (`data-testid="derived-<attr>"`;
  `gm-action-ratings.spec.ts` re-targeted).
- **F54** · CX · Wizard name/identity inputs use fixed pixel `maxWidth` (460/480) rather than a
  responsive max. `CharacterCreationWizard.tsx:80`, `IdentityStep.tsx:87` → `w-full max-w-[...]`.
  **fixed (backlog round A, 2026-07-11)** — both swapped to `w-full max-w-md` / `max-w-lg`.

---

## Themes worth a dedicated pass

- **Async play-by-post is the product, but the shared feed is thin** (F2, F5, F6, F7) — joining,
  attribution, and timing are exactly what async multiplayer needs first.
- **The roll loop is a single basic action roll** (F3, F8, F9, F10, F16, F43, F52) — resistance,
  modifiers, teamwork, and consequences are the substance of Blades play.
- **Progression is half-built** (F17, F18, F19, F50) — characters advance; crews/factions largely
  don't.
- **Explainability** (F8, F24, F30, F32, F33, F34) — many mechanics are present but opaque to a
  newcomer; targeted help text is cheap and high-leverage.
