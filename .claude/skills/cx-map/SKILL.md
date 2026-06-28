---
name: cx-map
description: Maintain HeistMind's living CX map (every page + user flow, with notes) and its findings log, and use them to run user-validation walkthroughs and surface CX flaws / FitD-rule gaps. Use when changing any route, screen, flow, or user-facing copy (update the map in lockstep), or when auditing the product for things to fix or improve.
---

# cx-map

The single living reference for **what HeistMind is and does** — from the user's point of view — and
the discipline for keeping it true. It is the central home for product knowledge, **replacing the
retired Cline `.memory-bank/`** (a memory bank that drifted so far out of date it described a
pre-launch app — a stale doc is worse than none, because it lies). This skill is the guide for
**user validation** and for **discovering flaws to fix and gaps against the Forged-in-the-Dark
(FitD) rules**.

## Files this skill owns

- **`BRD.md`** (sibling) — **the scope-of-record**: the product statement, requirements (R-A…R-I),
  non-goals, the BRD-vs-current gap analysis, and the phased roadmap. Read it before planning new
  work; when scope changes, edit it first, then reconcile the others.
- **`STATUS.md`** (sibling) — what HeistMind is, what's built, the architecture/constraints worth
  knowing, and current plans. The product-state doc the memory bank used to (badly) hold.
- **`CX-MAP.md`** (sibling) — the map: every route, the character-creation wizard, the campaign
  panels, the GM/player roles, and the end-to-end journeys. Each section carries a
  `_Last verified:_ <date> @ <short-sha>` marker.
- **`COMPETITIVE.md`** (sibling) — the value proposition (one product, two modes), the competitive
  frame (vs **D&D Beyond** and **Avrae**), and the ranked **P0 gaps**. Read it with `BRD.md` when
  planning positioning or new differentiating work.
- **`FINDINGS.md`** (sibling) — the flaw / FitD-gap log: severity-scored, each with a concrete
  location and a proposed fix, tracked from `open` to `fixed @<sha>`. The de-facto backlog.

These are plain Markdown — open them directly. `STATUS.md` + `CX-MAP.md` are the stable reference;
`FINDINGS.md` is the churn; `BRD.md` + `COMPETITIVE.md` are the scope + positioning.

## Live-update mandate (the core rule)

**Any change that touches a route, screen, component, flow, or user-facing copy MUST update the
matching section of `CX-MAP.md` in the same PR, and bump that section's `_Last verified:_` marker
to the date + short SHA of the change.** Any issue discovered or fixed updates `FINDINGS.md`. The
PR is not done until the map matches reality. This is what keeps the map from rotting — treat a map
edit as part of the diff, like a test.

When you finish a unit of UI work, ask: _did a user-visible thing change?_ If yes, the map changes
too.

## How to run a CX audit pass

Walk each flow in `CX-MAP.md` through **two lenses**. Log everything genuine to `FINDINGS.md`;
verify each finding against the actual code before logging — no speculation.

**Lens 1 — UX heuristics**

- Visibility of system status — does the user always know the current state and _why_ an action is
  blocked (e.g. why "Next"/"Create" is disabled)?
- FitD-terminology match — labels use the words a Blades GM/player expects.
- User control & undo — every increment can be decremented; destructive actions confirm.
- Consistency, error prevention, plain-language recovery copy (not raw Postgres/HTTP errors).
- Recognition over recall; sensible empty / loading / error states.
- **Persistence across reload** — this is an async play-by-post tool, so shared state must survive a
  refresh and be visible to every player on load. Test the reload.
- Responsive / mobile; accessibility (keyboard, focus order, ARIA, and **contrast** — the
  hover-pip bug F1 is this class).
- GM-vs-player affordances — is read-only obviously read-only? Can a player even join?

**Lens 2 — FitD fidelity**
Does each surfaced mechanic match the rules, and which expected play moves are missing? Probe:
action roll **position/effect**, **resistance rolls + stress spend**, **devil's bargain**,
**push-yourself**, **teamwork** (assist / lead group action / set up / protect), **downtime actions**
(recover, acquire asset, long-term project, reduce heat, train, indulge vice + overindulgence),
**flashbacks**, gather information, fortune rolls, clocks (incl. linked), crew XP/advancement +
upgrades, faction status/clocks, harm healing + armor + **trauma conditions**, load → encounter
limits.

Parallelizing the sweep across areas (one agent per route/panel) is fine for breadth, but the
person running the skill verifies each finding before it lands in the log.

## Findings format

Each entry in `FINDINGS.md` follows:

```
### F<n> — <one-line summary>
- **severity:** S1 (blocker) | S2 (major) | S3 (minor) | S4 (polish)
- **type:** CX-flaw | FitD-gap
- **where:** <file:line or route/region>
- **root cause:** <why it happens, citing code>
- **fix:** <concrete proposed fix>
- **status:** open | fixed @<sha>
```

Severity: **S1** core flow broken/blocked · **S2** major friction or a missing core rules move ·
**S3** minor · **S4** polish.

## User-validation checklist

To validate (human tester or `gmPage`/`playerPage` Playwright), walk the journeys in `CX-MAP.md`
end to end and, at each step, ask the Lens-1 questions above. The journeys are written as numbered
steps for exactly this. Anything that makes you pause, second-guess, or hunt → a finding.

## Shipping a fix

Findings graduate into fixes through the existing **`deploy-verify-promote`** loop (sibling skill:
`.claude/skills/deploy-verify-promote/SKILL.md`) — branch → PR to `development` (CI green) →
promote to `main` → prod. When a fix lands, flip its finding to `fixed @<sha>` and update any
affected `CX-MAP.md` section + its `_Last verified:_` marker.
