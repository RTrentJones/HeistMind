# Character Creation Wizard

A **ruleset-driven** character creation flow. The steps, playbooks, attributes,
and abilities all come from the game's loaded `Ruleset` — nothing is hardcoded to
Blades in the Dark, so custom GM rulesets work without code changes.

## Architecture (code)

```
features/characters/
  lib/creation-steps.ts            # stepKind(), deriveSteps(), emptyDraft() — ruleset → step list
  stores/character-creation-store.ts  # Zustand draft store (persisted, resumable); submit() → repository
  components/
    CharacterCreationWizard.tsx    # shell: name field + stepper + nav + submit
    WizardStep.tsx                 # dispatch step.id → step component (falls back to ChoiceStep)
    steps/
      PlaybookStep.tsx             # Card grid of ruleset.content.playbooks
      AttributesStep.tsx           # StressTracker dot-allocator per attribute (+ point-buy budget)
      AbilitiesStep.tsx            # multi-select ruleset.content.specialAbilities
      IdentityStep.tsx             # heritage / background / vice inputs
      ReviewStep.tsx               # read-only character-sheet summary
      ChoiceStep.tsx               # generic options renderer for unrecognized custom steps
app/games/[gameId]/characters/new/page.tsx   # loads game+ruleset, renders the wizard
```

Data flow: `page` loads `GameWithDetails` (`repositories.games.findWithDetails`) →
passes `ruleset` to `CharacterCreationWizard` → `deriveSteps(ruleset)` builds the
step list → each step reads/writes the `CharacterData` draft in the store →
`submit()` resolves the current user from `useAuthStore`, builds
`CreateCharacterData`, and calls `repositories.characters.create(...)`.

**Step matching:** `stepKind()` normalizes a step's free-form `id` to a known kind
(`playbook | attributes | abilities | identity | review | choice`). A ruleset that
defines its own `characterCreation.steps` drives the order/labels; a thin ruleset
falls back to `DEFAULT_STEPS`. Unknown step ids render the generic `ChoiceStep`.

## Designing the screens in Claude Design

The `@heist-mind/ui` design system is synced to the **HeistMind UI Library**
project on claude.ai/design. Design each step there with the real components, then
the JSX maps onto the components above (swap `window.HeistMindUi.X` →
`import { X } from '@heist-mind/ui'`). Paste these prompts as starting points —
design against representative Blades data so layouts are concrete; the code stays
ruleset-driven.

> Prefix each prompt with: **"Using the HeistMind UI Library design system,"** so the
> agent builds with the real components.

### 1. Wizard shell

> Build a multi-step character-creation wizard shell. A required "Character name"
> `Input` at top. Below it a horizontal stepper of `Badge`s — steps "Playbook,
> Attributes, Abilities, Identity, Review" — current step in the `ember` variant,
> completed in `success`, upcoming in `outline`. Below, an `h2` `Heading` (variant
> `primary`) with the step name and a muted `Text` description, then a content
> area. Footer: a ghost "Cancel" `Button` on the left; "Back" (outline) and
> "Next" (default) / "Create character" (ember) on the right. Dark theme.

### 2. Playbook picker

> A responsive 3-column `Grid` of `Card`s, one per playbook (Cutter, Hound, Leech,
> Lurk, Slide, Spider, Whisper). Each card: `CardTitle` with the playbook name,
> `CardDescription` with a one-line summary. The selected card uses the `character`
> variant with an `ember` `Badge` reading "Selected"; unselected use `outline`.
> Hover lifts the card slightly.

### 3. Attribute allocator

> A vertical stack of `Card`s, one per attribute (Insight, Prowess, Resolve). Each
> card header shows the attribute name and small `outline` `Badge`s for its
> actions (e.g. Prowess → Finesse, Prowl, Skirmish, Wreck). Card body: a muted
> description and a **StressTracker** dot row (interactive, showNumbers) acting as a
> 0–4 rating allocator. At the top, a `steel` `Badge` showing "X / 7 points spent"
> that turns `stress-critical` when over budget.

### 4. Special abilities

> A vertical list of selectable `Card`s, one per special ability. Each: `CardTitle`
> name, `CardDescription` rules text, a `gold` `Badge` "Tier N" when applicable.
> Selected cards use the `success` variant with a `success` `Badge` "Chosen".
> Multi-select.

### 5. Identity

> Three stacked `Input`s with labels and helper text: "Heritage" (origin/upbringing),
> "Background" (life before the crew), "Vice" (how they blow off stress). Keep it
> clean and narrow.

### 6. Review (character sheet)

> A single `character`-variant `Card` summarizing the character: a `gradient` > `Heading` with the name, a muted subtitle with the playbook, then sections for
> Attributes (a row of `steel` `Badge`s like "Prowess 2"), Special Abilities (a row
> of `success` `Badge`s), and Identity (`outline` `Badge`s for heritage/background/
> vice). This is the final confirmation before "Create character".

## Bringing a design back into code

1. In Claude Design, copy the generated component for a step.
2. Replace `const { X } = window.HeistMindUi` with `import { X } from '@heist-mind/ui'`.
3. Drop it into the matching `steps/*.tsx`, wiring its values/handlers to the
   `useCharacterCreationStore` selectors already in place (e.g. `setPlaybook`,
   `setAttribute`, `toggleAbility`).
4. Keep the data ruleset-driven — map over `ruleset.content.*` rather than the
   sample data the design used.

(Alternatively, the Vercel MCP `import-claude-design-from-url` can scaffold a full
page from a Claude Design URL.)

## Known follow-ups

- `characters-store.ts` still has `// TODO: Get from auth` userIds for several CRUD
  actions; the creation store already resolves the real user via `useAuthStore`.
- The route assumes `repositories.games.findWithDetails` returns the ruleset; no
  membership/permission gating yet beyond "is authenticated".
- `ChoiceStep` is single-select; add multi-select / point-cost handling if rulesets
  need it (`CreationOption.cost`).
