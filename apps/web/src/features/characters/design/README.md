# Character creator — design source

These are the Claude Design (`claude.ai/design`) source compositions the repo's
character-creation wizard was ported from. They live in the **HeistMind UI Library**
design-system project and were built with the synced `@heist-mind/ui` components.

- Project: https://claude.ai/design/p/a2523874-6287-4817-ab03-c10404052bd8
- `CharacterCreator.dc.html` — **vendored here** (full version: 3-column rail / stage /
  live-summary layout). Source of the repo's `layout="rail"` shell.
- `character-creator-spec` (in the project) — the contract-aligned single-column wizard
  (5 canonical steps, `ruleset.content.*` data shape). Source of the default `layout="single"`
  shell and the step components.
- `character-creator-parts` (in the project) — hi-fi parts gallery (stepper variants,
  playbook cards, dot allocator, ability cards, avatar/vice pickers, summary panel).

`.dc.html` is Claude Design's template format (`x-import`, `sc-for`, `sc-if`, `{{ }}`
bindings + a `class Component extends DCLogic` script). It needs the Claude Design runtime
to render; it's kept here as the **design reference**, not as buildable code. The buildable
React port is the rest of `features/characters/` — see `../README.md`.

> Direction note: design-sync is one-way (repo → Claude Design). Bringing designs _back_
> is a manual design→code port (translate the `.dc.html` to React, keep the ruleset-driven
> store/route/repository wiring).
